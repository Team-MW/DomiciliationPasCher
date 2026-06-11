async function testUploadBoth() {
    const cloudName = 'dopqcjwi7';
    const uploadPreset = 'ml_default';
    const resourceType = 'raw';
    
    // Create a dummy PDF file content
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let body = '';
    
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="upload_preset"\r\n\r\n';
    body += uploadPreset + '\r\n';
    
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="resource_type"\r\n\r\n';
    body += 'raw\r\n';
    
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="file"; filename="test.pdf"\r\n';
    body += 'Content-Type: application/pdf\r\n\r\n';
    body += '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n111\n%%EOF\r\n';
    
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
        console.log("Headers:", Object.fromEntries(response.headers.entries()));
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
testUploadBoth();
