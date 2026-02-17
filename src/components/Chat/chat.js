document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    
    if (!chatContainer) {
        console.error('Chat container not found');
        return;
    }
    
    // Получаем количество вопросов из DOM
    const questionsCount = document.querySelectorAll('[data-message^="question-"]').length;
    let currentQuestionIndex = -1;
    let isShowingNextQuestion = false;
    let chatStarted = false;
    
    // Отладочная информация
    //console.log('Chat initialized. Questions count:', questionsCount);
    
    // Проверяем наличие элементов в DOM
    const allQuestions = document.querySelectorAll('[data-message^="question-"]');
    const allAnswers = document.querySelectorAll('[data-message^="answers-"]');
    //console.log('Questions in DOM:', allQuestions.length, 'Answers in DOM:', allAnswers.length);
    
    if (questionsCount === 0) {
        console.error('No questions found! Make sure quizSteps prop is passed correctly.');
    }
    
    // Функция для прокрутки чата вниз
    const scrollToBottom = () => {
        if (chatMessages) {
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
        }        
    };

    // Функция для установки времени сообщения
    const setMessageTime = (element) => {
        const timeElement = element.querySelector('[data-time]');
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
        }
    };

    // Функция для показа сообщения
    const showMessage = (selector, delay = 0) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const message = document.querySelector(selector);
                if (message) {
                    message.classList.remove('hide');
                    setMessageTime(message);
                    scrollToBottom();
                    resolve();
                } else {
                    console.warn('Message not found:', selector);
                    resolve();
                }
            }, delay);
        });
    };

    // Функция для показа индикатора печати
    const showTypingIndicator = (selector, delay = 0) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const indicator = document.querySelector(selector);
                if (indicator) {
                    indicator.classList.remove('hide');
                    indicator.style.display = 'flex';
                    scrollToBottom();
                    resolve();
                } else {
                    console.warn('Typing indicator not found:', selector);
                    resolve();
                }
            }, delay);
        });
    };

    // Функция для скрытия индикатора печати
    const hideTypingIndicator = (selector) => {
        const indicator = document.querySelector(selector);
        if (indicator) {
            indicator.classList.add('hide');
            indicator.style.display = 'none';
        }
    };

    // Функция для показа следующего вопроса
    const showNextQuestion = () => {
        if (isShowingNextQuestion) return;
        isShowingNextQuestion = true;
        
        currentQuestionIndex++;
        
        if (currentQuestionIndex >= questionsCount) {
            // Показываем финальное сообщение и форму
            showTypingIndicator('[data-typing="before-final"]', 0)
                .then(() => {
                    return new Promise(resolve => setTimeout(resolve, 1500));
                })
                .then(() => {
                    hideTypingIndicator('[data-typing="before-final"]');
                    return showMessage('[data-message="final-message"]', 500);
                })
                .then(() => {
                    return showMessage('[data-message="final-form"]', 500);
                });
            return;
        }

        // Показываем индикатор печати перед вопросом
        const typingSelector = currentQuestionIndex === 0 
            ? '[data-typing="before-first-question"]'
            : `[data-typing="before-question-${currentQuestionIndex}"]`;

        showTypingIndicator(typingSelector, 0)
            .then(() => {
                return new Promise(resolve => setTimeout(resolve, 1500));
            })
            .then(() => {
                hideTypingIndicator(typingSelector);
                // Показываем вопрос
                return showMessage(`[data-message="question-${currentQuestionIndex}"]`, 500);
            })
            .then(() => {
                // Показываем варианты ответов
                return showMessage(`[data-message="answers-${currentQuestionIndex}"]`, 300);
            })
            .then(() => {
                isShowingNextQuestion = false;
            });
    };

    // Инициализация последовательности сообщений
    const initChat = async () => {
        try {
            // Показываем приветствие сразу
            await showMessage('[data-message="greeting"]', 500);
            
            // Показываем индикатор печати после приветствия
            await showTypingIndicator('[data-typing="after-greeting"]', 0);
            await new Promise(resolve => setTimeout(resolve, 1500));
            hideTypingIndicator('[data-typing="after-greeting"]');
            
            // Показываем сообщение о вопросах
            await showMessage('[data-message="questions-intro"]', 500);
            
            // Небольшая пауза перед показом индикатора печати
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Проверяем, есть ли вопросы
            if (questionsCount === 0) {
                console.warn('No questions found in DOM');
                return;
            }
            
            // Проверяем наличие элементов перед показом
            const firstQuestionIndicator = document.querySelector('[data-typing="before-first-question"]');
            const firstQuestion = document.querySelector('[data-message="question-0"]');
            const firstAnswers = document.querySelector('[data-message="answers-0"]');
            
            if (!firstQuestionIndicator || !firstQuestion || !firstAnswers) {
                console.error('First question elements not found in DOM', {
                    indicator: !!firstQuestionIndicator,
                    question: !!firstQuestion,
                    answers: !!firstAnswers
                });
                return;
            }
            
            // Показываем первый вопрос
            await showTypingIndicator('[data-typing="before-first-question"]', 0);
            await new Promise(resolve => setTimeout(resolve, 1500));
            hideTypingIndicator('[data-typing="before-first-question"]');
            await showMessage('[data-message="question-0"]', 500);
            await showMessage('[data-message="answers-0"]', 300);
            currentQuestionIndex = 0; // Устанавливаем индекс первого вопроса
        } catch (error) {
            console.error('Error in initChat:', error);
        }
    };

    // Функция для блокировки вариантов ответа в вопросе
    const lockQuestionAnswers = (questionIndex) => {
        const inputs = document.querySelectorAll(`input[data-question-index="${questionIndex}"]`);
        const answerOptions = document.querySelector(`[data-message="answers-${questionIndex}"]`);
        
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        if (answerOptions) {
            answerOptions.classList.add('locked');
        }
    };

    // Обработка выбора ответа
    const handleAnswerSelection = (questionIndex) => {
        if (isShowingNextQuestion) return;
        
        // Проверяем, что выбран хотя бы один ответ
        const inputs = document.querySelectorAll(`input[data-question-index="${questionIndex}"]`);
        const hasSelection = Array.from(inputs).some(input => {
            if (input.type === 'radio') {
                return input.checked;
            } else if (input.type === 'checkbox') {
                return input.checked;
            }
            return false;
        });

        if (hasSelection && questionIndex === currentQuestionIndex) {
            // Небольшая задержка перед показом следующего вопроса
            setTimeout(() => {
                showNextQuestion();
            }, 500);
        }
    };

    // Обработка выбора ответа
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('chat-answer-input')) {
            const input = e.target;
            const questionIndex = parseInt(input.dataset.questionIndex);
            
            // Убираем выделение других радио-кнопок того же вопроса
            if (input.type === 'radio') {
                const questionId = input.dataset.questionId;
                const otherInputs = document.querySelectorAll(`input[name="${questionId}"]`);
                otherInputs.forEach(otherInput => {
                    if (otherInput !== input) {
                        otherInput.checked = false;
                    }
                });
            }
            
            // Блокируем варианты ответа сразу после выбора
            lockQuestionAnswers(questionIndex);
            
            scrollToBottom();
            
            // Запускаем проверку и показ следующего вопроса
            setTimeout(() => {
                handleAnswerSelection(questionIndex);
            }, 300);
        }
    });

    // Intersection Observer для запуска чата при попадании в зону видимости
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1 // запускаем когда видно хотя бы 10% элемента
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !chatStarted) {
                chatStarted = true;
                //console.log('Chat is now visible, starting conversation...');
                initChat();
                // Отключаем observer после первого запуска
                observer.disconnect();
            }
        });
    }, observerOptions);

    // Начинаем наблюдение за контейнером чата
    observer.observe(chatContainer);
    
    // Автоматически скроллим страницу к низу чата при изменении его высоты
    // Но только после того, как пользователь сам доскроллил до чата
    if (chatContainer && chatMessages) {
        let lastHeight = chatContainer.offsetHeight;
        let scrollTimeout;
        let isChatVisible = false; // Флаг: был ли чат уже виден пользователю
        
        // Проверяем, виден ли чат при загрузке страницы
        const checkInitialVisibility = () => {
            const rect = chatContainer.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            if (isVisible) {
                isChatVisible = true;
            }
        };
        
        // Проверяем при загрузке
        checkInitialVisibility();
        
        // Отслеживаем, когда пользователь доскроллил до чата
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isChatVisible) {
                    // Пользователь доскроллил до чата - включаем автоматическую прокрутку
                    isChatVisible = true;
                }
            });
        }, {
            threshold: 0.1 // Когда видно хотя бы 10% чата
        });
        
        visibilityObserver.observe(chatContainer);
        
        // Функция для скролла страницы к низу чата
        const scrollToChatBottom = () => {
            // Скроллим только если чат уже был виден пользователю
            if (!isChatVisible) {
                return;
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (chatContainer) {
                    // Получаем позицию низа чата относительно верха страницы
                    const chatBottom = chatContainer.getBoundingClientRect().bottom + window.scrollY;
                    
                    // Плавно скроллим страницу к низу чата
                    window.scrollTo({
                        top: chatBottom - window.innerHeight + 20, // 20px отступ от низа экрана
                        behavior: 'smooth'
                    });
                }
            }, 50); // Небольшая задержка для стабилизации изменений
        };
        
        // Отслеживаем изменения высоты чата (ResizeObserver)
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const newHeight = entry.target.offsetHeight;
                    // Если высота изменилась, скроллим к низу
                    if (Math.abs(newHeight - lastHeight) > 1) {
                        lastHeight = newHeight;
                        scrollToChatBottom();
                    }
                }
            });
            
            resizeObserver.observe(chatContainer);
            resizeObserver.observe(chatMessages);
        }
        
        // Отслеживаем изменения в содержимом чата (показ новых сообщений, изменение формы)
        const mutationObserver = new MutationObserver(() => {
            const newHeight = chatContainer.offsetHeight;
            if (Math.abs(newHeight - lastHeight) > 1) {
                lastHeight = newHeight;
                scrollToChatBottom();
            }
        });
        
        mutationObserver.observe(chatContainer, {
            attributes: true,
            attributeFilter: ['class', 'style'],
            childList: true,
            subtree: true
        });
        
        mutationObserver.observe(chatMessages, {
            attributes: true,
            attributeFilter: ['class', 'style'],
            childList: true,
            subtree: true
        });
    }
});