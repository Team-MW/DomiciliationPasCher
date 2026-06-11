async function testUploadImageEndpoint() {
    const cloudName = 'dopqcjwi7';
    const uploadPreset = 'ml_default';
    const resourceType = 'image'; // USING IMAGE ENDPOINT FOR PDF!
    
    const pdfBase64 = "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgLVR5cGUgL1BhZ2VzIC9LaWRzIFtdIC9Db3VudCAwID4+CmVuZG9iagp4cmVmCjAgMwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDMgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjExMQolJUVPRg==";
    const dataUrl = `data:application/pdf;base64,${pdfBase64}`;
    
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = '';
    
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="upload_preset"\r\n\r\n';
    body += uploadPreset + '\r\n';
    
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="public_id"\r\n\r\n';
    body += 'test_pdf_as_image' + '\r\n';

    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="file"\r\n\r\n';
    body += dataUrl + '\r\n';
    
    body += '--' + boundary + '--\r\n';
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
        });
        
        console.log("Status:", response.status);
        console.log("Response:", await response.text());
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
testUploadImageEndpoint();
