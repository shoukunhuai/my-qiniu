const qiniu = require('../index')
const express = require('express')

const bucket = process.env.MY_QINIU_BUCKET || '81pics-blob-pub';
const ak = process.env.MY_QINIU_AK || '1oGGRjt4fYJGn2UmtKrymqMeG6l2c8gPnzpHDV44';
const sk = process.env.MY_QINIU_SK || 'ocX66W-_ylVnTP6KrIJMjzSpy8rG9qKGQvKyhYTJ';

const fileBucket = new qiniu.Bucket({
    bucket,
    ak,
    sk
})


const app = express()

app.listen(8500)

app.use(`/qiniu/${bucket}`, fileBucket.Router())