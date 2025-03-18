function runSTREAMWOOD(streamwood) {
    if (streamwood.swKey && streamwood.swDomainKey) {
        // Основной скрипт
        var mainScript = document.createElement('script');
        mainScript.src = `https://clients.streamwood.ru/code?swKey=${streamwood.swKey}&swDomainKey=${streamwood.swDomainKey}`;
        mainScript.defer = true;
        mainScript.charset = 'utf-8';
        document.head.appendChild(mainScript);

        // Скрипт для квиза
        var quizScript = document.createElement('script');
        quizScript.src = `https://clients.streamwood.ru/quiz/code/?swKey=${streamwood.swKey}&swDomainKey=${streamwood.swDomainKey}`;
        quizScript.defer = true;
        quizScript.charset = 'utf-8';
        document.head.appendChild(quizScript);
    }
} 