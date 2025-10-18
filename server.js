const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises; // Используем fs.promises для async/await

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


async function getYoutubeComments(apiKey, videoId, maxResults = 500) {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    let comments = [];
    let nextPageToken = null;
    let totalCommentsProcessed = 0;

    while (totalCommentsProcessed < maxResults) {
        try {
            const response = await youtube.commentThreads.list({
                part: 'snippet',
                videoId: videoId,
                maxResults: Math.min(100, maxResults - totalCommentsProcessed),
                pageToken: nextPageToken
            });

            const items = response.data.items || [];
            for (const item of items) {
                const topLevelComment = item.snippet.topLevelComment.snippet;
                 const likeCount = item.snippet.topLevelComment.snippet.likeCount || 0;
                let commentItem = {
                    id: item.id,
                    author: topLevelComment.authorDisplayName,
                    text: topLevelComment.textDisplay,
                    publishedAt: topLevelComment.publishedAt,
                    likeCount: likeCount,  // Добавляем likeCount
                    replies: [] // Добавляем пустой массив для ответов
                };


                 if(item.snippet.totalReplyCount > 0) {
                        commentItem.replies = await getCommentReplies(youtube, item.id);
                 }
                  comments.push(commentItem);
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


async function getCommentReplies(youtube, parentId) {
    let replies = [];
     let nextPageToken = null;
    try {
           do {
                 const response = await youtube.comments.list({
                      part: 'snippet',
                      parentId: parentId,
                      maxResults: 100,
                         pageToken: nextPageToken,
                    });
                  
                   const items = response.data.items || [];
                     for (const item of items) {
                        const reply = item.snippet;
                        replies.push({
                            author: reply.authorDisplayName,
                            text: reply.textDisplay,
                             publishedAt: reply.publishedAt,
                         });
                    }

                nextPageToken = response.data.nextPageToken;

               } while (nextPageToken)
        } catch(error) {
             console.error(`Ошибка при извлечении ответов на комментарий: ${error}`);
             return [];
        }
       return replies;
}

app.post('/get-comments', async (req, res) => {
    const apiKey = req.body.apiKey;
    const videoId = req.body.videoId;
    const maxResults = req.body.maxResults || 500;

    if (!apiKey || !videoId) {
        return res.status(400).send({error: 'Необходимо предоставить API ключ и ID видео.'});
    }

    try {
        const comments = await getYoutubeComments(apiKey, videoId, maxResults);
        res.send({ comments: comments });

    } catch(error) {
        console.error(error);
        res.status(500).send({ error: 'Ошибка при получении комментариев.' });
    }
});


app.post('/save-comments', async (req, res) => {
     const comments = req.body.comments;
     if (!comments) {
         return res.status(400).send({ error: 'Нет данных для сохранения.' });
    }
     try {
       const filename = `comments_${Date.now()}.json`;
        await fs.writeFile(path.join(__dirname, 'public', filename), JSON.stringify(comments, null, 2));
        res.send({ message: 'Комментарии сохранены успешно', filename: filename });
     } catch (error) {
          console.error(`Ошибка при сохранении коментариев: ${error}`);
          res.status(500).send({ error: 'Ошибка при сохранении комментариев.' });
      }
});

app.post('/save-comment', async (req, res) => {
    const comment = req.body.comment;
     if (!comment) {
        return res.status(400).send({ error: 'Нет комментария для сохранения.' });
     }
      try {
          const filename = `comment_${Date.now()}.json`;
          await fs.writeFile(path.join(__dirname, 'public', filename), JSON.stringify(comment, null, 2));
          res.send({ message: 'Комментарий сохранен успешно', filename: filename });
      } catch (error) {
         console.error(`Ошибка при сохранении коментария: ${error}`);
          res.status(500).send({ error: 'Ошибка при сохранении комментария.' });
     }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});