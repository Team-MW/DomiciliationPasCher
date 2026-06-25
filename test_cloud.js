import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
    const match = env.match(new RegExp(`^${key}='?([^'\\n]+)'?`, 'm'));
    return match ? match[1] : null;
};

const cloudName = getEnv('VITE_CLOUDINARY_CLOUD_NAME');
const uploadPreset = getEnv('VITE_CLOUDINARY_UPLOAD_PRESET') || 'ml_default';

async function testUpload() {
    console.log("Cloud:", cloudName, "Preset:", uploadPreset);
    
    // Create a minimal dummy PDF
    const dummyPdfBase64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLY31jBQsTAz1DMyA1EoxRb1IIfc8CwUzI2NVIwWlxLwU00IIm2EaJMCiQABAAAD//wEABk4L+gplbmRzdHJlYW0KZW5kb2JqCgozIDAgb2JqCjQ4CmVuZG9iagoKMSAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDU5NSA4NDJdL1BhcmVudCA0IDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNSAwIFI+Pj4+L0NvbnRlbnRzIDIgMCBSPj4KZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1sxIDAgUl0vQ291bnQgMT4+CmVuZG9iagoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKCjYgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDQgMCBSPj4KZW5kb2JqCgo3IDAgb2JqCjw8L0NyZWF0b3IoRG1pbWluKTozKQovUHJvZHVjZXIoRG1pbWluKTozKT4+CmVuZG9iagoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTQ2IDAwMDAwIG4gCjAwMDAwMDAwMTkgMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjQ1IDAwMDAwIG4gCjAwMDAwMDAzMDIgMDAwMDAgbiAKMDAwMDAwMDM5MCAwMDAwMCBuIAowMDAwMDAwNDM5IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA4L1Jvb3QgNiAwIFIvSW5mbyA3IDAgUj4+CnN0YXJ0eHJlZgo1MTkKJSVFT0YK";
    const dataUri = `data:application/pdf;base64,${dummyPdfBase64}`;

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', uploadPreset);
    formData.append('resource_type', 'auto');

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log("Response:", data);
    } catch(e) {
        console.error("Error:", e);
    }
}

testUpload();
