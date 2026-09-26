import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const calendarConnections=sqliteTable('calendar_connections',{
 userId:text('user_id').primaryKey(),refreshToken:text('refresh_token'),calendarId:text('calendar_id'),leaseUntil:integer('lease_until').notNull().default(0),updatedAt:integer('updated_at').notNull(),
});
export const calendarOauth=sqliteTable('calendar_oauth',{
 stateHash:text('state_hash').primaryKey(),userId:text('user_id').notNull(),verifier:text('verifier').notNull(),expiresAt:integer('expires_at').notNull(),
},t=>[index('idx_calendar_oauth_expiry').on(t.expiresAt)]);
export const calendarPlans=sqliteTable('calendar_plans',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1),
 syncStatus:text('sync_status').notNull().default('pending'),errorCode:text('error_code'),googleUrl:text('google_url'),leaseUntil:integer('lease_until').notNull().default(0),updatedAt:integer('updated_at').notNull(),
},t=>[index('idx_calendar_plans_user').on(t.userId,t.updatedAt)]);
export const pushSubscriptions=sqliteTable('push_subscriptions',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),subscription:text('subscription').notNull(),spots:text('spots').notNull(),threshold:integer('threshold').notNull(),updatedAt:integer('updated_at').notNull(),lastTest:integer('last_test').notNull().default(0),
},t=>[index('idx_push_user').on(t.userId)]);
export const pushDeliveries=sqliteTable('push_deliveries',{
 id:text('id').primaryKey(),status:text('status').notNull(),updatedAt:integer('updated_at').notNull(),
});
export const pushJobs=sqliteTable('push_jobs',{
 id:text('id').primaryKey(),leaseUntil:integer('lease_until').notNull().default(0),lastSuccess:integer('last_success'),
});
export const intelligenceBatches=sqliteTable('intelligence_batches',{
 id:text('id').primaryKey(),spotId:text('spot_id').notNull(),retrievedAt:integer('retrieved_at').notNull(),payload:text('payload').notNull(),
},t=>[index('idx_intelligence_spot_time').on(t.spotId,t.retrievedAt)]);
export const riderProfiles=sqliteTable('rider_profiles',{
 userId:text('user_id').primaryKey(),payload:text('payload').notNull(),updatedAt:integer('updated_at').notNull(),
});
export const riderRecords=sqliteTable('rider_records',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),kind:text('kind').notNull(),payload:text('payload').notNull(),createdAt:integer('created_at').notNull(),
},t=>[index('idx_rider_records_user').on(t.userId,t.createdAt)]);
export const observationRecords=sqliteTable('observation_records',{
 id:text('id').primaryKey(),spotId:text('spot_id').notNull(),observedAt:integer('observed_at').notNull(),payload:text('payload').notNull(),
});
export const forecastErrors=sqliteTable('forecast_errors',{
 id:text('id').primaryKey(),spotId:text('spot_id').notNull(),payload:text('payload').notNull(),createdAt:integer('created_at').notNull(),
});
