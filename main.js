const { google } = require('googleapis');

async function getYoutubeComments(apiKey, videoId, maxResults = 500) {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    const comments = [];
    let nextPageToken = null;
    let totalCommentsProcessed = 0;

    while (totalCommentsProcessed < maxResults) {
        try {
            const response = await youtube.commentThreads.list({
                part: 'snippet',
                videoId: videoId,
                maxResults: Math.min(100, maxResults - totalCommentsProcessed), // Максимум 100 за раз
                pageToken: nextPageToken
            });

            const items = response.data.items || [];
            for (const item of items) {
                const comment = item.snippet.topLevelComment.snippet;
                comments.push({
                    author: comment.authorDisplayName,
                    text: comment.textDisplay,
                    publishedAt: comment.publishedAt,
                });
            }

            totalCommentsProcessed += items.length;
            nextPageToken = response.data.nextPageToken;

            if (!nextPageToken) {
                break;
            }
        } catch (error) {
            console.error(`Ошибка при извлечении комментариев: ${error}`);
            break;
        }
    }
    return comments;
}

async function main() {
    const API_KEY = 'AIzaSyAKY71C8ythnerVGq4TUVAAdab9Sc06PL0'; // Замените на ваш API ключ
    const VIDEO_ID = 'XcmNv1UwYnk'; // Замените на ID видео


    const maxCommentsToExtract = 500;  // Можем изменить, если нужно больше или меньше
    const comments = await getYoutubeComments(API_KEY, VIDEO_ID, maxCommentsToExtract);

    if (comments && comments.length > 0) {
        console.log(`Найдено ${comments.length} комментариев.`);
        for (const comment of comments) {
            console.log('-'.repeat(30));
            console.log(`Автор: ${comment.author}`);
            console.log(`Дата публикации: ${comment.publishedAt}`);
            console.log(`Комментарий: ${comment.text}`);
        }
    } else {
        console.log('Комментарии не найдены или произошла ошибка при извлечении.');
    }
}

main();












