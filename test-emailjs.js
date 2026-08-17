export const handleEmailJS = async (req, res) => {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk.toString(); });
    req.on('end', async () => {
        try {
            const body = JSON.parse(bodyStr || '{}');
            const { email, nom, type, amount, paymentLink } = body;
            
            // ...
        } catch(e) {}
    });
}
