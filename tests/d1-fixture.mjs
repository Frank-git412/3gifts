import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
export function database(){
 const db=new DatabaseSync(':memory:');
 for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 const binding={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},async run(){return db.prepare(sql).run(...args);}}},async first(){return db.prepare(sql).get()||null;},async run(){return db.prepare(sql).run();}};},async batch(stmts){const results=[];for(const s of stmts)results.push(await s.run());return results;}};
 return {db,binding};
}
