
const inicializarLogin = () => {
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) return;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        console.log(document.getElementById('username').value)
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    codigo_username: username,
                    password: password 
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.user.role);
                // window.location.href = 'index.html';
            } else {
                if (errorMessage) {
                    errorMessage.style.display = 'block';
                    errorMessage.innerText = data.message;
                }
            }
        } catch (error) {
            console.error('Erro de ligação:', error);
        }
    });
};

// 2. FORÇAMOS o browser a esperar que o HTML esteja pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarLogin);
} else {
    inicializarLogin();
}
