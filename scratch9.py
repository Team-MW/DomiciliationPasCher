import subprocess
import sys

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--break-system-packages"])

try:
    import pdfplumber
except ImportError:
    install('pdfplumber')
    import pdfplumber

with pdfplumber.open("public/Procuration_Postale.pdf") as pdf:
    page = pdf.pages[0]
    words = page.extract_words()
    for w in words:
        print(f"'{w['text']}' at x:{w['x0']:.1f}, y:{w['top']:.1f}")
