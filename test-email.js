async function send() {
  const serviceId = 'service_rlofvjj';
  const templateId = 'template_h70fvsh';
  const publicKey = '6YILUpK9_xU_iVDvR';
  const privateKey = 'AybxeTUe4y7awsbIMmfGv';
  
  try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              service_id: serviceId,
              template_id: templateId,
              user_id: publicKey,
              accessToken: privateKey,
              template_params: {
                  to_email: 'mwcrea.agency@gmail.com',
                  client_name: 'Test Client',
                  website_link: 'http://localhost'
              }
          })
      });

      if (response.ok) {
          console.log('Success');
      } else {
          const err = await response.text();
          console.error('Failed:', err);
      }
  } catch (e) {
      console.error('Error:', e);
  }
}
send();
