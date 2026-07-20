async function send() {
  try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              service_id: 'service_faked123',
              template_id: 'template_h70fvsh',
              user_id: '6YILUpK9_xU_iVDvR',
              template_params: { to_email: 'test' }
          })
      });
      console.log(await response.text());
  } catch (e) {
      console.error(e);
  }
}
send();
