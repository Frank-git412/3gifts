import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const amazonGate=sqliteTable('amazon_gate',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),
 leaseUntil:integer('lease_until').notNull(),nextAt:integer('next_at').notNull(),blockedUntil:integer('blocked_until').notNull()
});
export const amazonCache=sqliteTable('amazon_cache',{
 key:text('key').primaryKey(),value:text('value').notNull(),expires:integer('expires').notNull()
},table=>[index('amazon_cache_expires').on(table.expires)]);

export const amazonRequests=sqliteTable('amazon_requests',{
 id:text('id').primaryKey(),createdAt:integer('created_at').notNull()
},table=>[index('amazon_requests_created_at').on(table.createdAt)]);
