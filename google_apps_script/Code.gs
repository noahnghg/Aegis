/**
 * Code.gs
 * Google Apps Script for Aegis Calendar Add-on
 */

// BASE_URL for the backed. 
// IMPORTANT: For local development, this must be a public URL (e.g., ngrok).
// production: 'https://your-production-url.com'
// local (via ngrok): 'https://<id>.ngrok-free.app'
var BASE_URL = 'https://replace-me-with-ngrok-url.ngrok-free.app'; 

/**
 * Entry point for the add-on.
 * Renders the homepage card.
 */
function onHomepageTrigger(e) {
  return createMainCard();
}

/**
 * Creates the main UI card.
 */
function createMainCard() {
  var builder = CardService.newCardBuilder();
  
  // Header
  var header = CardService.newCardHeader()
    .setTitle('Aegis LifeOS')
    .setSubtitle('Your AI Assistant in Calendar')
    .setImageStyle(CardService.ImageStyle.CIRCLE);
  builder.setHeader(header);
  
  // Section 1: Ask Aegis
  var section1 = CardService.newCardSection()
    .setHeader('Ask Aegis');
  
  var textInput = CardService.newTextInput()
    .setFieldName('query')
    .setTitle('What do you want to learn or plan?')
    .setHint('e.g., "Plan learning Python"');
    
  var action = CardService.newAction()
    .setFunctionName('handleAskAegis');
    
  var button = CardService.newTextButton()
    .setText('Ask Aegis')
    .setOnClickAction(action);
    
  section1.addWidget(textInput);
  section1.addWidget(button);
  builder.addSection(section1);
  
  // Section 2: Quick Schedule Check
  var section2 = CardService.newCardSection()
    .setHeader('Quick Actions');
    
  var scheduleAction = CardService.newAction()
    .setFunctionName('handleQuickSchedule');
    
  var scheduleButton = CardService.newTextButton()
    .setText('Check Schedule Conflicts')
    .setOnClickAction(scheduleAction);
    
  section2.addWidget(scheduleButton);
  builder.addSection(section2);
  
  return builder.build();
}

/**
 * Handles the "Ask Aegis" button click.
 */
function handleAskAegis(e) {
  var query = e.formInput.query;
  
  if (!query) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Please enter a query."))
      .build();
  }
  
  try {
    var response = UrlFetchApp.fetch(BASE_URL + '/agent/run?query=' + encodeURIComponent(query), {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true
      // Note: Add Authorization header here if needed
    });
    
    var json = JSON.parse(response.getContentText());
    
    var resultText = "Processed: " + (json.message || json.response || JSON.stringify(json));
    
    // Update or push a new card with result
    var resultCard = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Aegis Response'))
      .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(resultText)))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(resultCard))
      .build();
      
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Error: " + err.toString()))
      .build();
  }
}

/**
 * Handles the "Check Schedule" button click.
 * Uses dummy dates for now or could infer from context if available.
 */
function handleQuickSchedule(e) {
  // For demo, checking next hour
  var now = new Date();
  var oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  var payload = {
    "start_time": now.toISOString(),
    "end_time": oneHourLater.toISOString(),
    "summary": "Quick Check"
  };
  
  try {
    var response = UrlFetchApp.fetch(BASE_URL + '/schedule/check', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
      // Note: Add Authorization header here if needed
    });
    
    var json = JSON.parse(response.getContentText());
    
    var message = json.conflict ? "Conflict found!" : "No conflict.";
    if (json.message) message += " " + json.message;
    
    var resultCard = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Schedule Check'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(message)))
      .build();
      
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(resultCard))
      .build();

  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Error: " + err.toString()))
      .build();
  }
}
