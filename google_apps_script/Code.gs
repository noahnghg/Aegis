/**
 * Code.gs
 * Google Apps Script for Aegis Calendar Add-on
 *
 * This is the sole user-facing interface for Aegis LifeOS.
 * It runs as a Google Calendar sidebar add-on and communicates
 * with the FastAPI backend for AI-powered planning and scheduling.
 */

// ─── Configuration ──────────────────────────────────────────
// IMPORTANT: Replace with your backend URL.
// For local dev, use a public tunnel (e.g. ngrok): 'https://<id>.ngrok-free.app'
// For production, use your deployed server URL.
var BASE_URL = 'https://replace-me-with-your-backend-url.ngrok-free.app';

// ─── Entry Point ────────────────────────────────────────────

/**
 * Called when the add-on is opened in Google Calendar.
 * Renders the homepage card.
 */
function onHomepageTrigger(e) {
  return createMainCard();
}

// ─── Main Card ──────────────────────────────────────────────

/**
 * Creates the main UI card with Ask, Schedule, and Upload sections.
 */
function createMainCard() {
  var builder = CardService.newCardBuilder();

  // Header
  builder.setHeader(
    CardService.newCardHeader()
      .setTitle('Aegis LifeOS')
      .setSubtitle('AI-Powered Calendar Assistant')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
  );

  // ── Section: Ask Aegis ──
  var askSection = CardService.newCardSection().setHeader('Ask Aegis');

  askSection.addWidget(
    CardService.newTextInput()
      .setFieldName('query')
      .setTitle('What do you want to learn or plan?')
      .setHint('e.g., "Plan learning Python in 4 weeks"')
  );

  askSection.addWidget(
    CardService.newTextButton()
      .setText('Ask Aegis')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName('handleAskAegis'))
  );

  builder.addSection(askSection);

  // ── Section: Quick Actions ──
  var quickSection = CardService.newCardSection().setHeader('Quick Actions');

  quickSection.addWidget(
    CardService.newTextButton()
      .setText('Check Next Hour for Conflicts')
      .setOnClickAction(CardService.newAction().setFunctionName('handleQuickSchedule'))
  );

  builder.addSection(quickSection);

  // ── Section: Upload PDF ──
  var uploadSection = CardService.newCardSection().setHeader('Knowledge Base');

  uploadSection.addWidget(
    CardService.newTextParagraph()
      .setText('Upload PDFs to Aegis so the AI can answer questions from your documents.')
  );

  uploadSection.addWidget(
    CardService.newTextButton()
      .setText('Open Upload Page')
      .setOpenLink(CardService.newOpenLink().setUrl(BASE_URL + '/docs#/default/upload_file_upload_post'))
  );

  builder.addSection(uploadSection);

  return builder.build();
}

// ─── Ask Aegis Handler ──────────────────────────────────────

/**
 * Sends the user's query to the backend orchestrator agent.
 * If the response is a learning plan, shows approve/revise buttons.
 */
function handleAskAegis(e) {
  var query = e.formInput.query;

  if (!query) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Please enter a query.'))
      .build();
  }

  try {
    var token = ScriptApp.getOAuthToken();

    var response = UrlFetchApp.fetch(BASE_URL + '/agent/run?query=' + encodeURIComponent(query), {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });

    var statusCode = response.getResponseCode();
    var json = JSON.parse(response.getContentText());

    if (statusCode >= 400) {
      throw new Error(json.detail || 'Server returned ' + statusCode);
    }

    // Build result card
    var resultBuilder = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Aegis Response'));

    var resultSection = CardService.newCardSection();

    if (json.intent === 'learn' && json.roadmap && json.roadmap.length > 0) {
      // Show the generated learning roadmap
      resultSection.addWidget(
        CardService.newTextParagraph().setText('<b>Learning Plan</b>\n' + json.message)
      );

      // Display roadmap items
      for (var i = 0; i < json.roadmap.length; i++) {
        var item = json.roadmap[i];
        var label = typeof item === 'string' ? item : (item.title || item.topic || JSON.stringify(item));
        resultSection.addWidget(
          CardService.newTextParagraph().setText((i + 1) + '. ' + label)
        );
      }

      // Approve / Revise buttons (human-in-the-loop)
      var threadId = json.thread_id;

      var approveAction = CardService.newAction()
        .setFunctionName('handleFeedback')
        .setParameters({ 'thread_id': threadId, 'action': 'COMMIT' });

      resultSection.addWidget(
        CardService.newTextButton()
          .setText('✅ Approve & Schedule')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(approveAction)
      );

      var reviseAction = CardService.newAction()
        .setFunctionName('handleRevisePrompt')
        .setParameters({ 'thread_id': threadId });

      resultSection.addWidget(
        CardService.newTextButton()
          .setText('✏️ Revise Plan')
          .setOnClickAction(reviseAction)
      );

    } else {
      // Generic response
      var responseText = json.response || json.message || JSON.stringify(json);
      resultSection.addWidget(
        CardService.newTextParagraph().setText(responseText)
      );
    }

    // Back button
    resultSection.addWidget(
      CardService.newTextButton()
        .setText('← Back')
        .setOnClickAction(CardService.newAction().setFunctionName('handleBack'))
    );

    resultBuilder.addSection(resultSection);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(resultBuilder.build()))
      .build();

  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + err.toString()))
      .build();
  }
}

// ─── Feedback Handlers ──────────────────────────────────────

/**
 * Shows a text input for the user to provide revision feedback.
 */
function handleRevisePrompt(e) {
  var threadId = e.parameters.thread_id;

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Revise Plan'))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextInput()
            .setFieldName('feedback')
            .setTitle('What would you like to change?')
            .setHint('e.g., "Make it 6 weeks instead of 4"')
        )
        .addWidget(
          CardService.newTextButton()
            .setText('Submit Feedback')
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('handleFeedback')
                .setParameters({ 'thread_id': threadId, 'action': 'UPDATE' })
            )
        )
    )
    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Sends approve or revise feedback to the backend.
 */
function handleFeedback(e) {
  var threadId = e.parameters.thread_id;
  var action = e.parameters.action;
  var feedback = (e.formInput && e.formInput.feedback) ? e.formInput.feedback : '';

  try {
    var token = ScriptApp.getOAuthToken();

    var url = BASE_URL + '/agent/feedback?thread_id=' + encodeURIComponent(threadId)
      + '&action=' + encodeURIComponent(action)
      + '&feedback=' + encodeURIComponent(feedback);

    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });

    var json = JSON.parse(response.getContentText());

    var resultBuilder = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Feedback Result'));

    var section = CardService.newCardSection();
    section.addWidget(
      CardService.newTextParagraph().setText(json.message || JSON.stringify(json))
    );

    // If updated, show the new roadmap
    if (json.status === 'paused' && json.roadmap) {
      for (var i = 0; i < json.roadmap.length; i++) {
        var item = json.roadmap[i];
        var label = typeof item === 'string' ? item : (item.title || item.topic || JSON.stringify(item));
        section.addWidget(
          CardService.newTextParagraph().setText((i + 1) + '. ' + label)
        );
      }

      // Allow another round of feedback
      section.addWidget(
        CardService.newTextButton()
          .setText('✅ Approve & Schedule')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleFeedback')
              .setParameters({ 'thread_id': threadId, 'action': 'COMMIT' })
          )
      );

      section.addWidget(
        CardService.newTextButton()
          .setText('✏️ Revise Again')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleRevisePrompt')
              .setParameters({ 'thread_id': threadId })
          )
      );
    }

    section.addWidget(
      CardService.newTextButton()
        .setText('← Start Over')
        .setOnClickAction(CardService.newAction().setFunctionName('handleBack'))
    );

    resultBuilder.addSection(section);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(resultBuilder.build()))
      .build();

  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + err.toString()))
      .build();
  }
}

// ─── Schedule Check Handler ─────────────────────────────────

/**
 * Checks the user's calendar for conflicts in the next hour.
 */
function handleQuickSchedule(e) {
  var now = new Date();
  var oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  var payload = {
    'start_time': now.toISOString(),
    'end_time': oneHourLater.toISOString(),
    'summary': 'Quick Check'
  };

  try {
    var token = ScriptApp.getOAuthToken();

    var response = UrlFetchApp.fetch(BASE_URL + '/schedule/check', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });

    var json = JSON.parse(response.getContentText());

    var message = json.conflict ? '⚠️ Conflict found!' : '✅ No conflict in the next hour.';
    if (json.message) message += '\n' + json.message;

    if (json.suggested_slots && json.suggested_slots.length > 0) {
      message += '\n\nSuggested slots:';
      for (var i = 0; i < json.suggested_slots.length; i++) {
        message += '\n• ' + json.suggested_slots[i];
      }
    }

    var resultCard = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Schedule Check'))
      .addSection(
        CardService.newCardSection()
          .addWidget(CardService.newTextParagraph().setText(message))
          .addWidget(
            CardService.newTextButton()
              .setText('← Back')
              .setOnClickAction(CardService.newAction().setFunctionName('handleBack'))
          )
      )
      .build();

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(resultCard))
      .build();

  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + err.toString()))
      .build();
  }
}

// ─── Navigation ─────────────────────────────────────────────

/**
 * Pops back to the main card.
 */
function handleBack(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot())
    .build();
}
