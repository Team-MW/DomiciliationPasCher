export const sendApprovalEmail = async (clientEmail, clientName) => {
    const serviceId = 'service_wbvb925';
    const templateId = 'template_h70fvsh';
    const publicKey = '6YILUpK9_xU_iVDvR';
    
    // Website link defaults to production or local
    const websiteLink = typeof window !== 'undefined' ? window.location.origin : 'https://domiciliation-pas-cher.fr';

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
                template_params: {
                    to_email: clientEmail,
                    email: clientEmail,
                    email_to: clientEmail,
                    client_email: clientEmail,
                    client_name: clientName || 'Client',
                    website_link: websiteLink
                }
            })
        });

        if (response.ok) {
            console.log('[EmailService] Email sent successfully to', clientEmail);
            return { success: true };
        } else {
            const err = await response.text();
            console.error('[EmailService] Failed to send email:', err);
            return { success: false, error: err || response.statusText };
        }
    } catch (error) {
        console.error('[EmailService] Network error sending email:', error);
        return { success: false, error: error.message };
    }
};
