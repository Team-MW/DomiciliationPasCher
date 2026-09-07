export const sendApprovalEmail = async (clientEmail, clientName) => {
    try {
        const response = await fetch('/api/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: clientEmail,
                nom: clientName || 'Client',
                type: 'approval'
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

export const sendNewMailNotification = async (clientEmail, clientName) => {
    try {
        const response = await fetch('/api/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: clientEmail,
                nom: clientName || 'Client',
                type: 'new_mail'
            })
        });

        if (response.ok) {
            console.log('[EmailService] Mail notification sent successfully to', clientEmail);
            return { success: true };
        } else {
            const err = await response.text();
            console.error('[EmailService] Failed to send mail notification:', err);
            return { success: false, error: err || response.statusText };
        }
    } catch (error) {
        console.error('[EmailService] Network error sending mail notification:', error);
        return { success: false, error: error.message };
    }
};
