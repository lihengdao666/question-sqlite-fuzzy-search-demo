const express = require('express')
const app = express()
const { check, validationResult } = require('express-validator');

const path = require("path");
const sqlite3 = require('sqlite3').verbose();



const valieKey = `bbs.tampermonkey.net.cn`
const suffix = `Racsw`
const port=3000


const db = new sqlite3.Database('data.db');

function startSqlite() {
  db.serialize(function () {
    db.loadExtension(path.resolve('./', "simple"));
    db.run("select jieba_dict(?)", path.resolve('./', "dict"));
    db.run("CREATE VIRTUAL TABLE if not exists fuzzySearch USING fts5(question,answer,type UNINDEXED, tokenize = 'simple')");
  })
}



function startServer() {
  app.use(express.json())
  app.post('/submit', [
    check('question').notEmpty(),
    check('answer').notEmpty(),
    check('type').notEmpty(),
  ], (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.json({ status: 'error', message: '参数不合法' });
    }
    const { question, answer, type } = req.body
    db.run("insert into fuzzySearch(question,answer,type) values (?,?,?)", [question, answer, type], (err) => {
      if (err == null) {
        res.json({ status: 'success', message: '上传成功' });
      } else {
        console.log("submit insert error :", err)
        res.json({ status: 'error', message: '上传失败' });
      }
    });

  })

  app.post('/search', [
    check('question').notEmpty(),
  ], (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.json({ status: 'error', message: '参数不合法' });
    }
    const { question } = req.body
    db.all("select rowid as id,question,answer,type from fuzzySearch where question match jieba_query(?) limit 0,10", [question], (err, rows) => {
      if (err == null) {
        console.log(rows)
        res.json({ status: 'success', message: rows });
      } else {
        console.log("submit insert error :", err)
        res.json({ status: 'error', message: '查询失败' });
      }
    });
  })
  app.post('/delete' + suffix, [
    check('id').notEmpty(),
    check('key').notEmpty(),
  ], (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.json({ status: 'error', message: '参数不合法' });
    }
    const { id, key } = req.body
    if (key !== valieKey) {
      return res.json({ status: 'error', message: 'key无效' });
    }
    db.run("DELETE FROM fuzzySearch WHERE rowid = ?", [id], (err) => {
      if (err == null) {
        res.json({ status: 'success', message: '删除成功' });
      } else {
        console.log("submit update error :", err)
        res.json({ status: 'error', message: '删除失败' });
      }
    });
  })
  app.post('/update' + suffix, [
    check('id').notEmpty(),
    check('question').notEmpty(),
    check('type').notEmpty(),
    check('answer').notEmpty(),
    check('key').notEmpty(),
  ], (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.json({ status: 'error', message: '参数不合法' });
    }
    const { id, question, type, answer, key } = req.body
    if (key !== valieKey) {
      return res.json({ status: 'error', message: 'key无效' });
    }
    db.run("UPDATE fuzzySearch SET question = ?,answer = ?,type = ? WHERE rowid = ?", [question, answer, type, id], (err) => {
      if (err == null) {
        res.json({ status: 'success', message: '修改成功' });
      } else {
        console.log("submit update error :", err)
        res.json({ status: 'error', message: '修改失败' });
      }
    });
  })
  app.listen(port, () => {
    console.log(`fuzzySearch app listening on port ${port}!`)
  })
}

function main() {
  startSqlite()
  startServer()
}
main()

