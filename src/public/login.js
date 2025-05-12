document.getElementById('login-btn').addEventListener('click', async function () {
    const email = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    
    try {
        console.log("Enviando a /auth:", { email, password });

        const response = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
    
        const result = await response.json();
    
        if (response.ok) {
            sessionStorage.setItem('token', result.token);
            window.location.href = '/dashboard';
        } else {
            alert(result.message || 'Error de autenticación');
            
        }
    } catch (error) {
        alert('Error al conectar con el servidor');
    }
});