const express = require('express');
const axios = require('axios');
const https = require('https')

const Base64 = require('crypto-js/enc-base64')
const Latin1 = require('crypto-js/enc-latin1')
const hmacSHA1 = require('crypto-js/hmac-sha1')

const Base64URLSafe = {
    stringify: Base64.stringify,
    // qiniu's url safe base64 encoding is padded
    _map: Base64._map.substr(0, 62) + '-_='
}

class RESTApp {
    constructor(ak, sk) {
        this.ak = ak || process.env.MY_QINIU_AK
        this.sk = sk || process.env.MY_QINIU_SK
    }

    async use(req, res, fn, args) {
        try {
            const { data } = (await fn.apply(this, args))
            res.json(data)
        } catch (e) {
            if (e.response) {
                res.status(e.response.status).json(e.response.data);
            } else {
                // not exception from axios
                res.status(500).end(e);
            }
        }
    }

}

class Bucket extends RESTApp {
    constructor(options) {
        const { bucket = process.env.MY_QINIU_BUCKET, ak, sk } = options || {};
        super(ak, sk)

        this.bucket = bucket;

        console.log('bucket=%s, ak=%s, sk=%s', this.bucket, this.ak, this.sk)

        let host = 'rs.qiniu.com'
        host = 'rs.qbox.me'
        host = 'rs-z0.qbox.me'
        this.rs = axios.create({
            baseURL: `http://${host}`,
            httpsAgent: new https.Agent({
                keepAlive: true,
                maxSockets: 100
            }),
            host
        })

        this.rs.interceptors.request.use(config => {

            let strToSign = `${config.url}\n`
            const sign = Base64URLSafe.stringify(hmacSHA1(strToSign, this.sk))

            config.headers.Authorization = `QBox ${this.ak}:${sign}`


            
            return config
        })

    }



    encodeUrl(path, bucket) {

        return Base64URLSafe.stringify(Latin1.parse(`${bucket || this.bucket}:${path}`))
    }

    async stat(path) {
        return this.rs.get(`/stat/${this.encodeUrl(path)}`)
    }

    async mv(src, dest, force, bucket) {
        return this.rs.post(`/move/${this.encodeUrl(src)}/${this.encodeUrl(dest, bucket)}/force/${force ? 'true' : 'false'}`)
    }

    async cp(src, dest, force, bucket) {
        return this.rs.post(`/copy/${this.encodeUrl(src)}/${this.encodeUrl(dest, bucket)}/force/${force ? 'true' : 'false'}`)
    }

    async rm(path) {
        return this.rs.post(`/delete/${this.encodeUrl(path)}`)
    }

    async ls(marker, limit, prefix, delimiter) {
        return this.rs.get('/list', {
            params: {
                bucket: this.bucket,
                marker,
                limit,
                prefix: prefix ? this.encodeUrl(prefix) : undefined,
                delimiter: delimiter ? this.end(delimiter) : undefined
            }
        })
    }

    upload(policy) {
        // url safe
        // sign
        const b64Policy = Base64.parse(JSON.stringify(policy))


    }

    /**
     * Return a router which will be mounted to context
     */
    Router() {
        const r = express.Router({
            strict: true
        });


        r.get(/\/stat\//, (req, res) => this.use(req, res, this.stat, [req.url.substr(6)]))
        r.get('/mv', (req, res) => this.use(req, res, this.mv, [req.query.src, req.query.dest, req.query.bucket, req.query.force]))
        r.get('/cp', (req, res) => this.use(req, res, this.cp, [req.query.src, req.query.dest, req.query.bucket, req.query.force]))

        r.delete(/\/rm\//, (req, res) => this.use(req, res, this.rm, [req.url.substr(3)]))

        r.get('/ls', (req, res) => this.use(req, res, this.ls, [req.query.marker, req.query.limit, req.query.prefix, req.query.delimiter]))

        r.post('/upload', (req, res) => {

            res.json({
                url: '',
                method: '',
                contentType: 'multipart/form-data',
                headers: {

                }
            })
        })

        return r;
    }
}


module.exports = {
    Bucket
}