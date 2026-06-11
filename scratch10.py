import pdfplumber
with pdfplumber.open("public/Procuration_Postale.pdf") as pdf:
    page = pdf.pages[0]
    print("Images found:", len(page.images))
    print("Text length:", len(page.extract_text() or ""))
