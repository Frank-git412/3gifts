import {sqliteTable,text,integer,real,index,primaryKey} from 'drizzle-orm/sqlite-core';
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

export const libraryProducts=sqliteTable('library_products',{
 conceptId:text('concept_id').notNull(),asin:text('asin').notNull(),rank:integer('rank').notNull(),
 parentAsin:text('parent_asin'),title:text('title'),price:real('price'),imageUrl:text('image_url'),detailUrl:text('detail_url'),
 available:integer('available').notNull().default(0),matchedAt:integer('matched_at').notNull(),checkedAt:integer('checked_at').notNull()
},table=>[primaryKey({columns:[table.conceptId,table.asin]}),index('library_products_checked_at').on(table.checkedAt)]);

export const libraryMatches=sqliteTable('library_matches',{
 conceptId:text('concept_id').primaryKey(),matchedAt:integer('matched_at').notNull(),outcome:text('outcome').notNull(),products:integer('products').notNull().default(0)
});
