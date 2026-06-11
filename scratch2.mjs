async function testUploadEmpty() {
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
    body += 'Content-Disposition: form-data; name="file"; filename="test.pdf"\r\n';
    body += 'Content-Type: application/pdf\r\n\r\n';
    body += '\r\n'; // Empty file
    
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
testUploadEmpty();
