from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=12)
pdf.cell(200, 10, txt="This is a test PDF for Aegis LifeOS.", ln=1, align="C")
pdf.cell(200, 10, txt="It contains some sample text to verify chunking and embedding.", ln=2, align="C")
pdf.output("test_doc.pdf")
print("Created test_doc.pdf")
