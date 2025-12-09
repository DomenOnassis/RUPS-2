import Phaser from 'phaser';

const API_URL = 'http://localhost:8000';

export default class LoginScene extends Phaser.Scene {
    constructor() {
        super('LoginScene');
        this.isLogin = true;
        this.inputs = {};
        this.errorText = null;
        this.loadingText = null;
    }

    create() {
        const { width, height } = this.scale;

        this.add.rectangle(0, 0, width, height - 150, 0xe8e8e8).setOrigin(0);
        this.add.rectangle(0, height - 150, width, 150, 0xd4c4a8).setOrigin(0);

        const tableX = width / 2;
        const tableY = height / 2 + 50;
        const tableWidth = 500;
        const tableHeight = 250;

        this.add.rectangle(tableX, tableY, tableWidth, 30, 0x8b4513).setOrigin(0.5);
        this.add.rectangle(tableX, tableY + 15, tableWidth - 30, tableHeight - 30, 0xa0826d).setOrigin(0.5, 0);
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x8b7355, 0.3);
        const gridSize = 30;
        const gridStartX = tableX - (tableWidth - 30) / 2;
        const gridStartY = tableY + 15;
        const gridEndX = tableX + (tableWidth - 30) / 2;
        const gridEndY = tableY + 15 + (tableHeight - 30);

        for (let x = gridStartX; x <= gridEndX; x += gridSize) {
            grid.beginPath();
            grid.moveTo(x, gridStartY);
            grid.lineTo(x, gridEndY);
            grid.strokePath();
        }
        for (let y = gridStartY; y <= gridEndY; y += gridSize) {
            grid.beginPath();
            grid.moveTo(gridStartX, y);
            grid.lineTo(gridEndX, y);
            grid.strokePath();
        }

        this.add.rectangle(tableX - tableWidth / 2 + 40, tableY + tableHeight / 2 + 20, 20, 150, 0x654321);
        this.add.rectangle(tableX + tableWidth / 2 - 40, tableY + tableHeight / 2 + 20, 20, 150, 0x654321);

        const panelWidth = 500;
        const panelHeight = 420;
        const panelX = width / 2 - panelWidth / 2;
        const panelY = height / 2 - panelHeight / 2 - 30;

        const panel = this.add.graphics();
        panel.fillStyle(0xffffff, 0.92);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);
        panel.lineStyle(3, 0xcccccc, 1);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 25);

        this.add.text(width / 2, panelY + 35, 'LOGIN', {
            fontFamily: 'Arial',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#222'
        }).setOrigin(0.5);

        const inputWidth = 350;
        const inputHeight = 45;

        const username = document.createElement('input');
        username.type = 'text';
        username.placeholder = 'Username';
        username.style.position = 'absolute';
        username.style.lineHeight = `${inputHeight}px`;
        username.style.width = `${inputWidth}px`;
        username.style.height = `${inputHeight}px`;
        username.style.left = `${width / 2 - inputWidth / 2}px`;
        username.style.top = `${panelY + 90}px`;
        username.style.borderRadius = '8px';
        username.style.padding = '5px';
        username.style.border = '1px solid #ccc';
        username.style.textAlign = 'center';
        username.style.fontSize = '18px';
        username.style.outline = 'none';
        username.style.backgroundColor = '#f9f9f9';
        document.body.appendChild(username);
        this.inputs.username = username;

        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = 'Email';
        emailInput.style.position = 'absolute';
        emailInput.style.lineHeight = `${inputHeight}px`;
        emailInput.style.width = `${inputWidth}px`;
        emailInput.style.height = `${inputHeight}px`;
        emailInput.style.left = `${width / 2 - inputWidth / 2}px`;
        emailInput.style.top = `${panelY + 150}px`;
        emailInput.style.borderRadius = '8px';
        emailInput.style.padding = '5px';
        emailInput.style.border = '1px solid #ccc';
        emailInput.style.textAlign = 'center';
        emailInput.style.fontSize = '18px';
        emailInput.style.outline = 'none';
        emailInput.style.backgroundColor = '#f9f9f9';
        emailInput.style.display = 'none';
        document.body.appendChild(emailInput);
        this.inputs.email = emailInput;

        const password = document.createElement('input');
        password.type = 'password';
        password.placeholder = 'Password';
        password.style.position = 'absolute';
        password.style.lineHeight = `${inputHeight}px`;
        password.style.width = `${inputWidth}px`;
        password.style.height = `${inputHeight}px`;
        password.style.left = `${width / 2 - inputWidth / 2}px`;
        password.style.top = `${panelY + 210}px`;
        password.style.borderRadius = '8px';
        password.style.padding = '5px';
        password.style.border = '1px solid #ccc';
        password.style.textAlign = 'center';
        password.style.fontSize = '18px';
        password.style.outline = 'none';
        password.style.backgroundColor = '#f9f9f9';
        document.body.appendChild(password);
        this.inputs.password = password;

        this.errorText = this.add.text(width / 2, panelY + 270, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ff4444'
        }).setOrigin(0.5);

        const buttonWidth = 150;
        const buttonHeight = 45;
        const buttonY = panelY + 330;

        const loginButtonX = width / 2 - 115;
        const registerButtonX = width / 2 + 115;

        const loginButtonBg = this.add.graphics();
        loginButtonBg.fillStyle(0x3399ff, 1);
        loginButtonBg.fillRoundedRect(loginButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);

        const loginButton = this.add.text(loginButtonX, buttonY, '▶ Login', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                loginButtonBg.clear();
                loginButtonBg.fillStyle(0x0f5cad, 1);
                loginButtonBg.fillRoundedRect(loginButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            })
            .on('pointerout', () => {
                loginButtonBg.clear();
                loginButtonBg.fillStyle(0x3399ff, 1);
                loginButtonBg.fillRoundedRect(loginButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            })
            .on('pointerdown', () => this.handleAuth());

        const registerButtonBg = this.add.graphics();
        registerButtonBg.fillStyle(0x66bb6a, 1);
        registerButtonBg.fillRoundedRect(registerButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);

        const registerButton = this.add.text(registerButtonX, buttonY, 'Register', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff'
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                registerButtonBg.clear();
                registerButtonBg.fillStyle(0x558b2f, 1);
                registerButtonBg.fillRoundedRect(registerButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            })
            .on('pointerout', () => {
                registerButtonBg.clear();
                registerButtonBg.fillStyle(0x66bb6a, 1);
                registerButtonBg.fillRoundedRect(registerButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            })
            .on('pointerdown', () => this.toggleMode(loginButtonBg, registerButtonBg, loginButton, registerButton));

        const backButton = this.add.text(40, 30, '↩ Back to menu', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#0066ff',
            padding: { x: 20, y: 10 }
        })
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => backButton.setStyle({ color: '#0044cc' }))
            .on('pointerout', () => backButton.setStyle({ color: '#0066ff' }))
            .on('pointerdown', () => this.cleanup());

        this.events.once('shutdown', () => this.cleanup());
    }

    toggleMode(loginBg, registerBg, loginButton, registerButton) {
        this.isLogin = !this.isLogin;
        this.inputs.email.style.display = this.isLogin ? 'none' : 'block';
        this.errorText.setText('');

        const { width, height } = this.scale;
        const panelHeight = 420;
        const panelY = height / 2 - panelHeight / 2 - 30;
        const buttonY = panelY + 330;
        const buttonWidth = 150;
        const buttonHeight = 45;
        const loginButtonX = width / 2 - 115;
        const registerButtonX = width / 2 + 115;

        if (this.isLogin) {
            loginBg.clear();
            loginBg.fillStyle(0x3399ff, 1);
            loginBg.fillRoundedRect(loginButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            registerBg.clear();
            registerBg.fillStyle(0xcccccc, 1);
            registerBg.fillRoundedRect(registerButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            loginButton.setText('▶ Login');
            registerButton.setText('Register');
        } else {
            loginBg.clear();
            loginBg.fillStyle(0xcccccc, 1);
            loginBg.fillRoundedRect(loginButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            registerBg.clear();
            registerBg.fillStyle(0x66bb6a, 1);
            registerBg.fillRoundedRect(registerButtonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 10);
            loginButton.setText('▶ Sign up');
            registerButton.setText('Back to login');
        }
    }

    async handleAuth() {
        const username = this.inputs.username.value.trim();
        const password = this.inputs.password.value.trim();

        this.errorText.setText('');

        if (this.isLogin) {
            if (!username || !password) {
                this.errorText.setText('Enter username and password!');
                return;
            }
            try {
                await this.login(username, password);
            } catch (error) {
                this.errorText.setText(error.message);
            }
        } else {
            const email = this.inputs.email.value.trim();
            if (!username || !password || !email) {
                this.errorText.setText('Fill in all fields!');
                return;
            }
            try {
                await this.register(username, password, email);
            } catch (error) {
                this.errorText.setText(error.message);
            }
        }
    }

    async login(username, password) {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', username);

        this.cleanup();
        this.scene.start('LabScene');
    }

    async register(username, password, email) {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });

        if (!response.ok) {
            let errorMsg = 'Registration failed';
            try {
                const error = await response.json();
                errorMsg = error.detail || errorMsg;
            } catch (e) {}
            throw new Error(errorMsg);
        }

        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);

        this.cleanup();
        this.scene.start('LabScene');
    }

    cleanup() {
        Object.values(this.inputs).forEach(input => {
            if (input && input.parentNode) {
                input.remove();
            }
        });
        this.scene.start('MenuScene');
    }
}
