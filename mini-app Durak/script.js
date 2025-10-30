let tg = window.Telegram.WebApp;
tg.expand();

class MultiplayerFoolGame {
    constructor() {
        this.suits = ['♠️', '♥️', '♦️', '♣️'];
        this.ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        this.playerCards = [];
        this.opponentCards = [];
        this.battleCards = [];
        this.trumpSuit = '';
        this.trumpCard = null;
        this.currentAttacker = null;
        this.gameState = 'waiting';
        this.selectedCardIndex = null;
        
        // Мультиплеер свойства
        this.roomId = null;
        this.roomName = '';
        this.players = [];
        this.playerId = this.generateId();
        this.opponentId = null;
        this.opponentName = 'Ожидание...';
        this.playerName = 'Игрок';
        this.isHost = false;
        this.timer = 30;
        this.timerInterval = null;
        
        this.gameStats = {
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            multiplayerWins: 0,
            multiplayerGames: 0
        };
        
        this.loadStats();
        this.setupEventListeners();
        this.initMenu();
        this.setupTelegramIntegration();
        this.setupMockMultiplayer(); // Временная заглушка для мультиплеера
    }

    setupTelegramIntegration() {
        if (!window.Telegram?.WebApp) {
            console.log('Запущено вне Telegram');
            return;
        }
        
        tg.expand();
        this.setupTheme();
        this.initUserData();
    }

    setupTheme() {
        const themeParams = tg.themeParams;
        if (themeParams.bg_color) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
        }
        if (themeParams.text_color) {
            document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color);
        }
        if (themeParams.button_color) {
            document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color);
        }
    }

    initUserData() {
        const user = tg.initDataUnsafe?.user;
        if (user) {
            this.playerName = user.first_name || 'Игрок';
            if (user.username) {
                this.playerName += ` (@${user.username})`;
            }
        }
        this.updatePlayerDisplays();
    }

    updatePlayerDisplays() {
        document.getElementById('player-label').textContent = this.playerName;
        document.getElementById('lobby-player-name').textContent = this.playerName;
    }

    // Временная заглушка мультиплеера (замени на реальный бэкенд)
    setupMockMultiplayer() {
        this.mockSocket = {
            rooms: {},
            onEvent: (event, callback) => {
                this.mockSocket[event] = callback;
            },
            emit: (event, data) => {
                console.log('Mock emit:', event, data);
                this.handleMockEvent(event, data);
            }
        };
    }

    handleMockEvent(event, data) {
        switch(event) {
            case 'createRoom':
                this.mockCreateRoom(data);
                break;
            case 'joinRoom':
                this.mockJoinRoom(data);
                break;
            case 'playerAction':
                this.mockPlayerAction(data);
                break;
        }
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // === МЕНЮ И ЛОББИ ===

    initMenu() {
        this.showScreen('menu-screen');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    createRoom() {
        const roomName = document.getElementById('room-name').value || `Комната ${this.playerName}`;
        this.roomName = roomName;
        this.roomId = this.generateId();
        this.isHost = true;
        
        this.players = [{
            id: this.playerId,
            name: this.playerName,
            isHost: true
        }];

        this.showScreen('lobby-screen');
        document.getElementById('lobby-title').textContent = `Комната: ${roomName}`;
        this.updatePlayersList();
        
        // Имитация подключения второго игрока через 3 секунды
        setTimeout(() => {
            this.mockOpponentJoin();
        }, 3000);
    }

    joinRoom() {
        const roomCode = document.getElementById('room-code').value;
        if (!roomCode) {
            this.showMessage('Введите код комнаты!', 'error');
            return;
        }

        this.roomId = roomCode;
        this.isHost = false;
        
        this.showScreen('lobby-screen');
        document.getElementById('lobby-title').textContent = 'Присоединение к комнате...';
        
        // Имитация успешного подключения
        setTimeout(() => {
            this.mockSuccessfulJoin();
        }, 1500);
    }

    mockOpponentJoin() {
        this.opponentId = this.generateId();
        this.opponentName = 'Соперник_' + Math.floor(Math.random() * 1000);
        
        this.players.push({
            id: this.opponentId,
            name: this.opponentName,
            isHost: false
        });

        this.updatePlayersList();
        document.getElementById('start-game-btn').disabled = false;
        this.showMessage(`🎮 ${this.opponentName} присоединился к игре!`, 'success');
    }

    mockSuccessfulJoin() {
        this.roomName = 'Комната соперника';
        this.opponentName = 'Создатель комнаты';
        this.isHost = false;
        
        this.players = [
            { id: this.opponentId, name: this.opponentName, isHost: true },
            { id: this.playerId, name: this.playerName, isHost: false }
        ];

        this.updatePlayersList();
        document.getElementById('lobby-title').textContent = `Комната: ${this.roomName}`;
        document.getElementById('start-game-btn').style.display = 'none';
        this.showMessage('✅ Успешно подключились к комнате!', 'success');
    }

    updatePlayersList() {
        const container = document.getElementById('players-in-room');
        container.innerHTML = '';
        
        this.players.forEach(player => {
            const playerEl = document.createElement('div');
            playerEl.className = `player-item ${player.id === this.playerId ? 'you' : ''}`;
            playerEl.innerHTML = `
                <span>${player.name}</span>
                ${player.isHost ? '<span class="badge-host">👑 Создатель</span>' : ''}
                ${player.id === this.playerId ? '<span class="badge-you">Вы</span>' : ''}
            `;
            container.appendChild(playerEl);
        });
    }

    startGame() {
        if (!this.isHost) return;
        
        this.initGame();
        this.showScreen('game-screen');
        this.updateGameInfo();
        
        // Имитация старта игры для обоих игроков
        setTimeout(() => {
            this.mockGameStart();
        }, 1000);
    }

    mockGameStart() {
        this.opponentName = this.players.find(p => p.id !== this.playerId)?.name || 'Соперник';
        document.getElementById('opponent-name').textContent = this.opponentName;
        
        // Определяем кто ходит первым
        this.currentAttacker = Math.random() > 0.5 ? 'player' : 'opponent';
        this.gameState = this.currentAttacker === 'player' ? 'attacking' : 'defending';
        
        this.updateGameState();
        this.startTimer();
    }

    // === ИГРОВАЯ ЛОГИКА (адаптированная для мультиплеера) ===

    initGame() {
        this.createDeck();
        this.shuffleDeck();
        this.determineTrump();
        this.dealCards();
        this.render();
    }

    createDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.deck.push({ suit, rank });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    determineTrump() {
        this.trumpCard = this.deck[this.deck.length - 1];
        this.trumpSuit = this.trumpCard.suit;
    }

    dealCards() {
        const trumpCard = this.deck.pop();
        this.playerCards = this.deck.splice(0, 6);
        this.opponentCards = this.deck.splice(0, 6);
        this.deck.push(trumpCard);
    }

    // === ДЕЙСТВИЯ ИГРОКА ===

    attack() {
        if (this.gameState !== 'attacking' || this.currentAttacker !== 'player' || this.selectedCardIndex === null) return;
        
        const card = this.playerCards[this.selectedCardIndex];
        this.battleCards.push({ 
            card: card, 
            type: 'attack',
            attacker: 'player',
            covered: false 
        });
        this.playerCards.splice(this.selectedCardIndex, 1);
        this.selectedCardIndex = null;
        
        this.gameState = 'defending';
        this.updateGameState();
        this.sendActionToOpponent('attack', { card });
    }

    defend() {
        if (this.gameState !== 'defending' || this.currentAttacker !== 'opponent' || this.selectedCardIndex === null) return;
        
        const defenseCard = this.playerCards[this.selectedCardIndex];
        const lastAttack = this.battleCards.filter(c => c.type === 'attack' && !c.covered)[0];
        
        if (lastAttack && this.canDefend(lastAttack.card, defenseCard)) {
            lastAttack.covered = true;
            this.battleCards.push({ 
                card: defenseCard, 
                type: 'defense',
                defender: 'player'
            });
            this.playerCards.splice(this.selectedCardIndex, 1);
            this.selectedCardIndex = null;
            
            this.checkBattleState();
            this.sendActionToOpponent('defend', { card: defenseCard });
        } else {
            this.showMessage('❌ Нельзя защититься этой картой!', 'error');
        }
    }

    throwCard() {
        if (this.gameState !== 'throwing' || this.currentAttacker !== 'player' || this.selectedCardIndex === null) return;
        
        const card = this.playerCards[this.selectedCardIndex];
        
        if (this.canThrow(card)) {
            this.battleCards.push({ 
                card: card, 
                type: 'attack',
                attacker: 'player',
                covered: false 
            });
            this.playerCards.splice(this.selectedCardIndex, 1);
            this.selectedCardIndex = null;
            
            this.gameState = 'defending';
            this.updateGameState();
            this.sendActionToOpponent('throw', { card });
        } else {
            this.showMessage('❌ Нельзя подкинуть эту карту!', 'error');
        }
    }

    takeCards() {
        if (this.gameState !== 'defending' || this.currentAttacker !== 'opponent') return;
        
        const takenCards = this.battleCards.map(bc => bc.card);
        this.playerCards.push(...takenCards);
        this.battleCards = [];
        this.gameState = 'attacking';
        this.currentAttacker = 'opponent';
        
        this.refillCards();
        this.updateGameState();
        this.sendActionToOpponent('take');
    }

    pass() {
        if (this.gameState !== 'throwing' || this.currentAttacker !== 'player') return;
        
        const allCovered = this.battleCards.filter(c => c.type === 'attack').every(c => c.covered);
        if (!allCovered) {
            this.showMessage('❌ Не все карты отбиты!', 'error');
            return;
        }
        
        this.battleCards = [];
        this.gameState = 'attacking';
        this.currentAttacker = 'opponent';
        
        this.refillCards();
        this.updateGameState();
        this.sendActionToOpponent('pass');
    }

    // === ВЗАИМОДЕЙСТВИЕ С СОПЕРНИКОМ ===

    sendActionToOpponent(action, data = {}) {
        const actionData = {
            action,
            playerId: this.playerId,
            roomId: this.roomId,
            ...data
        };
        
        console.log('Отправка действия:', actionData);
        // Здесь будет реальный вызов API/WebSocket
        this.mockOpponentResponse(action, data);
    }

    mockOpponentResponse(action, data) {
        // Имитация ответа соперника через случайную задержку
        const delay = 1000 + Math.random() * 2000;
        
        setTimeout(() => {
            switch(action) {
                case 'attack':
                    this.handleOpponentDefense(data.card);
                    break;
                case 'defend':
                    this.handleOpponentContinue();
                    break;
                case 'throw':
                    this.handleOpponentDefense(data.card);
                    break;
                case 'take':
                    this.handleOpponentAttack();
                    break;
                case 'pass':
                    this.handleOpponentAttack();
                    break;
            }
        }, delay);
    }

    handleOpponentDefense(attackCard) {
        const defenseCard = this.findOpponentDefenseCard(attackCard);
        
        if (defenseCard) {
            const lastAttack = this.battleCards.filter(c => c.type === 'attack' && !c.covered)[0];
            if (lastAttack) {
                lastAttack.covered = true;
                this.battleCards.push({
                    card: defenseCard,
                    type: 'defense', 
                    defender: 'opponent'
                });
                
                const cardIndex = this.opponentCards.findIndex(c => 
                    c.rank === defenseCard.rank && c.suit === defenseCard.suit
                );
                if (cardIndex !== -1) {
                    this.opponentCards.splice(cardIndex, 1);
                }
                
                this.checkBattleState();
            }
        } else {
            // Соперник забирает карты
            const takenCards = this.battleCards.map(bc => bc.card);
            this.opponentCards.push(...takenCards);
            this.battleCards = [];
            this.gameState = 'attacking';
            this.currentAttacker = 'player';
            this.refillCards();
            this.updateGameState();
        }
    }

    findOpponentDefenseCard(attackCard) {
        // Простая логика защиты бота
        return this.opponentCards.find(card => this.canDefend(attackCard, card));
    }

    handleOpponentContinue() {
        this.checkBattleState();
    }

    handleOpponentAttack() {
        if (this.opponentCards.length === 0) return;
        
        let attackCard;
        if (this.battleCards.length === 0) {
            // Первая атака - самая маленькая карта
            attackCard = this.getLowestCard(this.opponentCards);
        } else {
            // Подкидывание - карта того же достоинства
            const ranksOnTable = this.battleCards.map(bc => bc.card.rank);
            attackCard = this.opponentCards.find(card => ranksOnTable.includes(card.rank));
        }
        
        if (attackCard) {
            this.battleCards.push({
                card: attackCard,
                type: 'attack',
                attacker: 'opponent', 
                covered: false
            });
            
            const cardIndex = this.opponentCards.indexOf(attackCard);
            this.opponentCards.splice(cardIndex, 1);
            
            this.gameState = 'defending';
            this.updateGameState();
        } else {
            // Соперник говорит "Бито"
            this.battleCards = [];
            this.gameState = 'attacking';
            this.currentAttacker = 'player';
            this.refillCards();
            this.updateGameState();
        }
    }

    // === ОБЩИЕ МЕТОДЫ ===

    canDefend(attackCard, defenseCard) {
        if (defenseCard.suit === attackCard.suit) {
            return this.getCardValue(defenseCard) > this.getCardValue(attackCard);
        }
        if (defenseCard.suit === this.trumpSuit && attackCard.suit !== this.trumpSuit) {
            return true;
        }
        return false;
    }

    canThrow(card) {
        if (this.battleCards.length === 0) return false;
        if (this.battleCards.length >= 6) return false;
        
        const defenderCards = this.gameState === 'defending' ? this.playerCards.length : this.opponentCards.length;
        if (this.battleCards.length >= defenderCards) return false;
        
        const ranksOnTable = this.battleCards.map(bc => bc.card.rank);
        return ranksOnTable.includes(card.rank);
    }

    checkBattleState() {
        const allCovered = this.battleCards.filter(c => c.type === 'attack').every(c => c.covered);
        
        if (allCovered) {
            this.gameState = 'throwing';
            this.updateGameState();
        }
    }

    refillCards() {
        if (this.currentAttacker === 'player') {
            while (this.playerCards.length < 6 && this.deck.length > 0) {
                this.playerCards.push(this.deck.shift());
            }
            while (this.opponentCards.length < 6 && this.deck.length > 0) {
                this.opponentCards.push(this.deck.shift());
            }
        } else {
            while (this.opponentCards.length < 6 && this.deck.length > 0) {
                this.opponentCards.push(this.deck.shift());
            }
            while (this.playerCards.length < 6 && this.deck.length > 0) {
                this.playerCards.push(this.deck.shift());
            }
        }
        
        this.checkGameEnd();
    }

    getCardValue(card) {
        return this.ranks.indexOf(card.rank);
    }

    getLowestCard(cards) {
        if (cards.length === 0) return null;
        return cards.reduce((lowest, card) => 
            this.getCardValue(card) < this.getCardValue(lowest) ? card : lowest
        );
    }

    checkGameEnd() {
        if (this.playerCards.length === 0 && this.deck.length === 0) {
            this.endGame('win');
            return true;
        } else if (this.opponentCards.length === 0 && this.deck.length === 0) {
            this.endGame('lose');
            return true;
        }
        return false;
    }

    endGame(result) {
        this.gameState = 'gameOver';
        this.stopTimer();
        
        if (result === 'win') {
            this.gameStats.wins++;
            this.gameStats.multiplayerWins++;
            this.showMessage('🎉 Ты выиграл! Поздравляю! 🏆', 'win');
        } else {
            this.gameStats.losses++;
            this.showMessage('😢 Ты проиграл! Попробуй ещё раз! 💪', 'lose');
        }
        
        this.gameStats.gamesPlayed++;
        this.gameStats.multiplayerGames++;
        this.saveStats();
        
        setTimeout(() => {
            this.showScreen('menu-screen');
        }, 3000);
    }

    // === ТАЙМЕР ХОДА ===

    startTimer() {
        this.timer = 30;
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timer--;
            this.updateTimerDisplay();
            
            if (this.timer <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const timerEl = document.getElementById('timer-count');
        if (timerEl) {
            timerEl.textContent = this.timer;
            
            if (this.timer <= 10) {
                timerEl.style.color = '#e74c3c';
            } else if (this.timer <= 20) {
                timerEl.style.color = '#f39c12';
            } else {
                timerEl.style.color = 'white';
            }
        }
    }

    handleTimeout() {
        this.stopTimer();
        
        if (this.gameState === 'attacking' && this.currentAttacker === 'player') {
            this.showMessage('⏰ Время вышло! Ход переходит сопернику.', 'error');
            this.gameState = 'attacking';
            this.currentAttacker = 'opponent';
            this.updateGameState();
            this.handleOpponentAttack();
        } else if (this.gameState === 'defending' && this.currentAttacker === 'opponent') {
            this.showMessage('⏰ Время вышло! Ты забираешь карты.', 'error');
            this.takeCards();
        }
    }

    // === ОТОБРАЖЕНИЕ ===

    updateGameState() {
        this.stopTimer();
        
        if (this.gameState !== 'gameOver' && this.gameState !== 'waiting') {
            this.startTimer();
        }
        
        this.updateControls();
        this.updateGameMessage();
        this.render();
    }

    updateGameMessage() {
        let message = '';
        
        switch(this.gameState) {
            case 'attacking':
                message = this.currentAttacker === 'player' 
                    ? '🎯 Твой ход! Выбери карту для атаки.'
                    : '⚔️ Соперник атакует...';
                break;
            case 'defending':
                message = this.currentAttacker === 'opponent'
                    ? '🛡️ Защищайся! Выбери карту для защиты или забери карты.'
                    : '🛡️ Соперник защищается...';
                break;
            case 'throwing':
                message = this.currentAttacker === 'player'
                    ? '🎴 Можешь подкинуть карты или сказать "Бито".'
                    : '🎴 Соперник подкидывает карты...';
                break;
            case 'waiting':
                message = 'Ожидаем второго игрока...';
                break;
        }
        
        document.getElementById('game-state-message').textContent = message;
    }

    updateGameInfo() {
        document.getElementById('current-room-name').textContent = this.roomName;
        document.getElementById('room-code-display').textContent = ` (Код: ${this.roomId})`;
        document.getElementById('opponent-name').textContent = this.opponentName;
    }

    render() {
        this.renderTrump();
        this.renderDeck();
        this.renderPlayerCards();
        this.renderOpponentCards();
        this.renderBattleCards();
        
        document.getElementById('player-cards-count').textContent = `(${this.playerCards.length})`;
        document.getElementById('opponent-cards-count').textContent = `(${this.opponentCards.length})`;
    }

    renderTrump() {
        const trumpElement = document.getElementById('trump-card');
        if (this.trumpCard) {
            trumpElement.innerHTML = this.createCardHTML(this.trumpCard);
        }
    }

    renderDeck() {
        document.getElementById('deck-count').textContent = this.deck.length;
    }

    renderPlayerCards() {
        const container = document.getElementById('player-cards');
        container.innerHTML = '';
        
        this.playerCards.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index, 'player');
            container.appendChild(cardElement);
        });
    }

    renderOpponentCards() {
        const container = document.getElementById('opponent-cards');
        container.innerHTML = '';
        
        this.opponentCards.forEach(() => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card opponent-card';
            container.appendChild(cardElement);
        });
    }

    renderBattleCards() {
        const container = document.getElementById('battle-cards');
        container.innerHTML = '';
        
        const attackCards = this.battleCards.filter(bc => bc.type === 'attack');
        const defenseCards = this.battleCards.filter(bc => bc.type === 'defense');
        
        for (let i = 0; i < attackCards.length; i++) {
            const attackCard = attackCards[i];
            const defenseCard = defenseCards[i];
            
            const pairContainer = document.createElement('div');
            pairContainer.className = 'battle-pair';
            
            const attackElement = document.createElement('div');
            attackElement.className = defenseCard ? 'attack-card' : 'single-attack-card';
            attackElement.innerHTML = this.createCardHTML(attackCard.card);
            pairContainer.appendChild(attackElement);
            
            if (defenseCard) {
                const defendElement = document.createElement('div');
                defendElement.className = 'defend-card';
                defendElement.innerHTML = this.createCardHTML(defenseCard.card);
                pairContainer.appendChild(defendElement);
            }
            
            container.appendChild(pairContainer);
        }
    }

    createCardElement(card, index, type) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${this.getSuitClass(card.suit)}`;
        cardElement.innerHTML = this.createCardHTML(card);
        
        if (type === 'player') {
            cardElement.classList.add('player-card');
            if (index === this.selectedCardIndex) {
                cardElement.classList.add('selected');
            }
            
            cardElement.addEventListener('click', () => {
                this.selectCard(index);
            });
        }
        
        return cardElement;
    }

    createCardHTML(card) {
        return `
            <div class="card-inner">
                <div class="card-rank">${card.rank}</div>
                <div class="card-suit">${card.suit}</div>
            </div>
        `;
    }

    selectCard(index) {
        if (this.gameState === 'attacking' || this.gameState === 'throwing' || this.gameState === 'defending') {
            this.selectedCardIndex = this.selectedCardIndex === index ? null : index;
            this.render();
        }
    }

    updateControls() {
        const attackBtn = document.getElementById('attack-btn');
        const defendBtn = document.getElementById('defend-btn');
        const throwBtn = document.getElementById('throw-btn');
        const takeBtn = document.getElementById('take-btn');
        const passBtn = document.getElementById('pass-btn');
        
        if (this.gameState === 'gameOver') {
            attackBtn.style.display = 'none';
            defendBtn.style.display = 'none';
            throwBtn.style.display = 'none';
            takeBtn.style.display = 'none';
            passBtn.style.display = 'none';
            return;
        }
        
        const isPlayerTurn = this.currentAttacker === 'player';
        
        attackBtn.style.display = (this.gameState === 'attacking' && isPlayerTurn) ? 'block' : 'none';
        defendBtn.style.display = (this.gameState === 'defending' && !isPlayerTurn) ? 'block' : 'none';
        throwBtn.style.display = (this.gameState === 'throwing' && isPlayerTurn) ? 'block' : 'none';
        takeBtn.style.display = (this.gameState === 'defending' && !isPlayerTurn) ? 'block' : 'none';
        passBtn.style.display = (this.gameState === 'throwing' && isPlayerTurn) ? 'block' : 'none';
        
        attackBtn.disabled = this.selectedCardIndex === null;
        defendBtn.disabled = this.selectedCardIndex === null;
        
        if (this.selectedCardIndex !== null) {
            const selectedCard = this.playerCards[this.selectedCardIndex];
            throwBtn.disabled = !this.canThrow(selectedCard);
        } else {
            throwBtn.disabled = true;
        }
        
        const allCovered = this.battleCards.filter(c => c.type === 'attack').every(c => c.covered);
        passBtn.disabled = !allCovered;
    }

    getSuitClass(suit) {
        switch(suit) {
            case '♠️': return 'spades';
            case '♣️': return 'clubs';
            case '♥️': return 'hearts';
            case '♦️': return 'diamonds';
            default: return 'spades';
        }
    }

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

    showMessage(text, type = 'info') {
        const messageEl = document.getElementById('game-message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        
        if (type !== 'info') {
            setTimeout(() => {
                messageEl.textContent = '';
                messageEl.className = 'message';
            }, 3000);
        }
    }

    inviteFriend() {
        const inviteText = `Присоединяйся к моей игре в Дурака! 🃏\nКод комнаты: ${this.roomId || 'XXXX'}\n\n${window.location.href}`;
        
        if (window.Telegram?.WebApp) {
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(inviteText)}`);
        } else {
            if (navigator.share) {
                navigator.share({
                    title: 'Дурак Мультиплеер',
                    text: inviteText,
                    url: window.location.href
                });
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(inviteText).then(() => {
                    this.showMessage('📋 Ссылка скопирована в буфер!', 'success');
                });
            } else {
                alert(inviteText);
            }
        }
    }

    copyRoomLink() {
        const link = `${window.location.href}?room=${this.roomId}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                this.showMessage('📋 Ссылка скопирована!', 'success');
            });
        } else {
            prompt('Скопируйте ссылку:', link);
        }
    }

    showStats() {
        const statsText = `📊 Статистика мультиплеера:
Побед: ${this.gameStats.multiplayerWins}
Поражений: ${this.gameStats.losses}
Всего игр: ${this.gameStats.multiplayerGames}
Винрейт: ${this.gameStats.multiplayerGames > 0 ? 
    Math.round((this.gameStats.multiplayerWins / this.gameStats.multiplayerGames) * 100) : 0}%`;
        
        this.showMessage(statsText, 'info');
    }

    setupEventListeners() {
        // Кнопки меню
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.showScreen('join-screen'));
        document.getElementById('invite-btn').addEventListener('click', () => this.inviteFriend());
        document.getElementById('stats-btn').addEventListener('click', () => this.showStats());

        // Лобби
        document.getElementById('start-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('copy-link-btn').addEventListener('click', () => this.copyRoomLink());
        document.getElementById('leave-lobby-btn').addEventListener('click', () => this.initMenu());

        // Присоединение
        document.getElementById('connect-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('back-to-menu-btn').addEventListener('click', () => this.initMenu());

        // Игровые кнопки
        document.getElementById('attack-btn').addEventListener('click', () => this.attack());
        document.getElementById('defend-btn').addEventListener('click', () => this.defend());
        document.getElementById('throw-btn').addEventListener('click', () => this.throwCard());
        document.getElementById('take-btn').addEventListener('click', () => this.takeCards());
        document.getElementById('pass-btn').addEventListener('click', () => this.pass());
        document.getElementById('surrender-btn').addEventListener('click', () => this.surrender());
    }

    surrender() {
        if (confirm('Точно хочешь сдаться?')) {
            this.endGame('lose');
        }
    }

    saveStats() {
        localStorage.setItem('foolMultiplayerStats', JSON.stringify(this.gameStats));
    }

    loadStats() {
        const saved = localStorage.getItem('foolMultiplayerStats');
        if (saved) {
            this.gameStats = JSON.parse(saved);
        }
    }
}

// Инициализация игры
let game;
document.addEventListener('DOMContentLoaded', function() {
    game = new MultiplayerFoolGame();
});

// Заглушка для Telegram Web App
if (typeof window.Telegram === 'undefined') {
    window.Telegram = {
        WebApp: {
            expand: function() { console.log('App expanded'); },
            initDataUnsafe: { user: { first_name: 'Игрок' } },
            themeParams: {},
            platform: 'unknown',
            openTelegramLink: function(url) { window.open(url, '_blank'); }
        }
    };
}