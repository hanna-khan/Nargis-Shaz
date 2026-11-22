CREATE TABLE `abandoned_carts` (
	`id` varchar(64) NOT NULL,
	`cart_id` varchar(64) NOT NULL,
	`email` varchar(254) NOT NULL,
	`subtotal` int NOT NULL,
	`currency` char(3) NOT NULL,
	`reminded_at` datetime(3),
	`recovered_order_id` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `abandoned_carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `abandoned_cart_uq` UNIQUE(`cart_id`)
);
--> statement-breakpoint
CREATE TABLE `account_deletion_requests` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`reason` varchar(500) NOT NULL DEFAULT '',
	`status` varchar(12) NOT NULL DEFAULT 'pending',
	`handled_by` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `account_deletion_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(64) NOT NULL,
	`actor_type` varchar(10) NOT NULL,
	`actor_id` varchar(64),
	`actor_label` varchar(160) NOT NULL,
	`action` varchar(64) NOT NULL,
	`entity_type` varchar(32) NOT NULL,
	`entity_id` varchar(64),
	`summary` varchar(500) NOT NULL,
	`changes` json,
	`ip` varchar(64),
	`user_agent` varchar(255),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `banners` (
	`id` varchar(64) NOT NULL,
	`placement` varchar(24) NOT NULL,
	`message` varchar(300) NOT NULL,
	`href` varchar(300),
	`image_id` varchar(64),
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` varchar(64) NOT NULL,
	`cart_id` varchar(64) NOT NULL,
	`variant_id` varchar(64) NOT NULL,
	`quantity` int NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_item_uq` UNIQUE(`cart_id`,`variant_id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` varchar(64) NOT NULL,
	`token_hash` char(64),
	`user_id` varchar(64),
	`market_id` varchar(64) NOT NULL,
	`coupon_code` varchar(40),
	`email` varchar(254),
	`status` varchar(12) NOT NULL DEFAULT 'active',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(64) NOT NULL,
	`parent_id` varchar(64),
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`image_id` varchar(64),
	`banner_id` varchar(64),
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`seo_title` varchar(160),
	`seo_description` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `category_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` varchar(64) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`eyebrow` varchar(120) NOT NULL DEFAULT '',
	`headline` varchar(240) NOT NULL DEFAULT '',
	`description` text NOT NULL,
	`occasion` varchar(16),
	`hero_id` varchar(64),
	`featured` boolean NOT NULL DEFAULT false,
	`seasonal` boolean NOT NULL DEFAULT false,
	`status` varchar(12) NOT NULL DEFAULT 'draft',
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`sort_order` int NOT NULL DEFAULT 0,
	`seo_title` varchar(160),
	`seo_description` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collection_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(254) NOT NULL,
	`order_number` varchar(24),
	`subject` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'new',
	`ip` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`code` char(2) NOT NULL,
	`name` varchar(80) NOT NULL,
	`market_id` varchar(64) NOT NULL,
	`address_format` varchar(8) NOT NULL,
	`phone_prefix` varchar(8) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `countries_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` varchar(64) NOT NULL,
	`coupon_id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`user_id` varchar(64),
	`email` varchar(254) NOT NULL,
	`amount` int NOT NULL,
	`currency` char(3) NOT NULL,
	`voided_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `redemption_order_uq` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` varchar(64) NOT NULL,
	`code` varchar(40) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	`type` varchar(16) NOT NULL,
	`percent_bps` int NOT NULL DEFAULT 0,
	`fixed_amounts` json NOT NULL,
	`minimum_subtotals` json NOT NULL,
	`maximum_discounts` json NOT NULL,
	`market_ids` json NOT NULL,
	`applies_to` varchar(12) NOT NULL DEFAULT 'all',
	`product_ids` json NOT NULL,
	`category_ids` json NOT NULL,
	`first_order_only` boolean NOT NULL DEFAULT false,
	`usage_limit` int,
	`per_customer_limit` int,
	`usage_count` int NOT NULL DEFAULT 0,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`code` char(3) NOT NULL,
	`name` varchar(64) NOT NULL,
	`symbol` varchar(8) NOT NULL,
	`locale` varchar(16) NOT NULL,
	`minor_digits` tinyint NOT NULL DEFAULT 2,
	`display_decimals` tinyint NOT NULL DEFAULT 0,
	`rate_from_pkr_micros` int NOT NULL DEFAULT 1000000,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `currencies_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`label` varchar(40) NOT NULL DEFAULT 'Home',
	`first_name` varchar(80) NOT NULL,
	`last_name` varchar(80) NOT NULL,
	`line1` varchar(200) NOT NULL,
	`line2` varchar(200),
	`city` varchar(100) NOT NULL,
	`region` varchar(100),
	`postal_code` varchar(20),
	`country_code` char(2) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_notes` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`staff_user_id` varchar(64) NOT NULL,
	`kind` varchar(12) NOT NULL DEFAULT 'note',
	`body` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `customer_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_profiles` (
	`user_id` varchar(64) NOT NULL,
	`preferred_market_id` varchar(64),
	`notification_prefs` json NOT NULL,
	`tags` json NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `customer_profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` varchar(64) NOT NULL,
	`notification_id` varchar(64),
	`provider` varchar(16) NOT NULL,
	`provider_message_id` varchar(128),
	`to_address` varchar(254) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`status` varchar(12) NOT NULL,
	`error` varchar(500),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` varchar(64) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`subject` varchar(8) NOT NULL,
	`user_id` varchar(64),
	`staff_user_id` varchar(64),
	`purpose` varchar(12) NOT NULL DEFAULT 'reset',
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_tokens_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `homepage_publications` (
	`id` varchar(64) NOT NULL,
	`snapshot` json NOT NULL,
	`published_by` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `homepage_publications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `homepage_section_items` (
	`id` varchar(64) NOT NULL,
	`section_id` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`title` varchar(200) NOT NULL DEFAULT '',
	`body` text NOT NULL,
	`href` varchar(300),
	`image_id` varchar(64),
	`product_id` varchar(64),
	`collection_id` varchar(64),
	CONSTRAINT `homepage_section_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `homepage_sections` (
	`id` varchar(64) NOT NULL,
	`type` varchar(24) NOT NULL,
	`name` varchar(120) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`eyebrow` varchar(160) NOT NULL DEFAULT '',
	`heading` varchar(300) NOT NULL DEFAULT '',
	`body` text NOT NULL,
	`primary_label` varchar(80),
	`primary_href` varchar(300),
	`secondary_label` varchar(80),
	`secondary_href` varchar(300),
	`image_id` varchar(64),
	`mobile_image_id` varchar(64),
	`settings` json NOT NULL,
	`updated_by` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `homepage_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`variant_id` varchar(64) NOT NULL,
	`on_hand` int NOT NULL DEFAULT 0,
	`reserved` int NOT NULL DEFAULT 0,
	`damaged` int NOT NULL DEFAULT 0,
	`low_stock_threshold` int,
	`location` varchar(60) NOT NULL DEFAULT 'Lahore atelier',
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `inventory_variant_id` PRIMARY KEY(`variant_id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` varchar(64) NOT NULL,
	`variant_id` varchar(64) NOT NULL,
	`type` varchar(20) NOT NULL,
	`quantity` int NOT NULL,
	`reserved_delta` int NOT NULL DEFAULT 0,
	`on_hand_after` int NOT NULL,
	`adjustment_id` varchar(64),
	`order_id` varchar(64),
	`staff_user_id` varchar(64),
	`note` varchar(500) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `markets` (
	`id` varchar(64) NOT NULL,
	`name` varchar(80) NOT NULL,
	`currency` char(3) NOT NULL,
	`default_country` char(2) NOT NULL,
	`zone` varchar(16) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `markets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` varchar(64) NOT NULL,
	`driver` varchar(12) NOT NULL,
	`storage_key` varchar(255),
	`url` varchar(1024) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mime_type` varchar(64) NOT NULL,
	`bytes` int NOT NULL DEFAULT 0,
	`width` int,
	`height` int,
	`alt` varchar(300) NOT NULL DEFAULT '',
	`folder` varchar(32) NOT NULL DEFAULT 'products',
	`checksum` char(64),
	`credit` json,
	`uploaded_by` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `navigation_items` (
	`id` varchar(64) NOT NULL,
	`menu_id` varchar(64) NOT NULL,
	`parent_id` varchar(64),
	`label` varchar(80) NOT NULL,
	`href` varchar(300) NOT NULL,
	`panel` varchar(40) NOT NULL DEFAULT 'none',
	`sort_order` int NOT NULL DEFAULT 0,
	`enabled` boolean NOT NULL DEFAULT true,
	CONSTRAINT `navigation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `navigation_menus` (
	`id` varchar(64) NOT NULL,
	`key` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `navigation_menus_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_key_uq` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` varchar(64) NOT NULL,
	`email` varchar(254) NOT NULL,
	`status` varchar(14) NOT NULL,
	`token_hash` char(64),
	`source` varchar(32) NOT NULL DEFAULT 'footer',
	`confirmed_at` datetime(3),
	`unsubscribed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `newsletter_subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `newsletter_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`key` varchar(48) NOT NULL,
	`name` varchar(120) NOT NULL,
	`subject` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`updated_by` varchar(64),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notification_templates_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(64) NOT NULL,
	`channel` varchar(8) NOT NULL DEFAULT 'email',
	`template_key` varchar(48) NOT NULL,
	`recipient` varchar(254) NOT NULL,
	`payload` json NOT NULL,
	`status` varchar(12) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`next_attempt_at` datetime(3),
	`last_error` varchar(500),
	`order_id` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_addresses` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`type` varchar(10) NOT NULL,
	`first_name` varchar(80) NOT NULL,
	`last_name` varchar(80) NOT NULL,
	`line1` varchar(200) NOT NULL,
	`line2` varchar(200),
	`city` varchar(100) NOT NULL,
	`region` varchar(100),
	`postal_code` varchar(20),
	`country_code` char(2) NOT NULL,
	`phone` varchar(32) NOT NULL,
	CONSTRAINT `order_addresses_id` PRIMARY KEY(`id`),
	CONSTRAINT `oaddr_uq` UNIQUE(`order_id`,`type`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`product_id` varchar(64),
	`variant_id` varchar(64),
	`product_name` varchar(160) NOT NULL,
	`product_slug` varchar(160) NOT NULL,
	`sku` varchar(80) NOT NULL,
	`colour` varchar(80) NOT NULL,
	`size` varchar(40) NOT NULL,
	`image_url` varchar(1024),
	`unit_price` int NOT NULL,
	`compare_at_price` int,
	`quantity` int NOT NULL,
	`line_total` int NOT NULL,
	`discount_allocated` int NOT NULL DEFAULT 0,
	`quantity_returned` int NOT NULL DEFAULT 0,
	`cost_price` int,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_notes` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`visibility` varchar(10) NOT NULL,
	`body` text NOT NULL,
	`staff_user_id` varchar(64),
	`notified_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `order_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`field` varchar(16) NOT NULL,
	`from_value` varchar(20),
	`to_value` varchar(20) NOT NULL,
	`actor_type` varchar(10) NOT NULL,
	`staff_user_id` varchar(64),
	`note` varchar(500) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(64) NOT NULL,
	`number` varchar(24) NOT NULL,
	`access_token_hash` char(64) NOT NULL,
	`idempotency_key` varchar(80) NOT NULL,
	`user_id` varchar(64),
	`email` varchar(254) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`market_id` varchar(64) NOT NULL,
	`currency` char(3) NOT NULL,
	`country_code` char(2) NOT NULL,
	`status` varchar(16) NOT NULL,
	`payment_status` varchar(20) NOT NULL,
	`payment_method` varchar(32) NOT NULL,
	`shipping_method_id` varchar(64),
	`shipping_label` varchar(120) NOT NULL,
	`subtotal` int NOT NULL,
	`discount_total` int NOT NULL DEFAULT 0,
	`shipping_total` int NOT NULL DEFAULT 0,
	`tax_total` int NOT NULL DEFAULT 0,
	`tax_included` int NOT NULL DEFAULT 0,
	`tax_label` varchar(40),
	`total` int NOT NULL,
	`amount_paid` int NOT NULL DEFAULT 0,
	`amount_refunded` int NOT NULL DEFAULT 0,
	`coupon_code` varchar(40),
	`customer_note` varchar(1000),
	`marketing_consent` boolean NOT NULL DEFAULT false,
	`ip` varchar(64),
	`placed_at` datetime(3) NOT NULL,
	`cancelled_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_number_uq` UNIQUE(`number`),
	CONSTRAINT `order_idem_uq` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(64) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`subject` varchar(8) NOT NULL,
	`user_id` varchar(64),
	`staff_user_id` varchar(64),
	`purpose` varchar(12) NOT NULL DEFAULT 'reset',
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` varchar(64) NOT NULL,
	`provider` varchar(24) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`label` varchar(80) NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	`market_ids` json NOT NULL,
	`mode` varchar(8) NOT NULL DEFAULT 'test',
	`enabled` boolean NOT NULL DEFAULT false,
	`limits` json NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` varchar(64) NOT NULL,
	`payment_id` varchar(64) NOT NULL,
	`type` varchar(16) NOT NULL,
	`amount` int NOT NULL,
	`currency` char(3) NOT NULL,
	`status` varchar(12) NOT NULL,
	`provider_transaction_id` varchar(128),
	`staff_user_id` varchar(64),
	`raw` json,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ptx_provider_uq` UNIQUE(`type`,`provider_transaction_id`)
);
--> statement-breakpoint
CREATE TABLE `payment_webhook_events` (
	`id` varchar(64) NOT NULL,
	`provider` varchar(24) NOT NULL,
	`event_id` varchar(160) NOT NULL,
	`event_type` varchar(80) NOT NULL,
	`signature_valid` boolean NOT NULL,
	`status` varchar(12) NOT NULL,
	`payload` json,
	`error` varchar(500),
	`attempts` int NOT NULL DEFAULT 1,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`processed_at` datetime(3),
	CONSTRAINT `payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_event_uq` UNIQUE(`provider`,`event_id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`method_id` varchar(64) NOT NULL,
	`provider` varchar(24) NOT NULL,
	`amount` int NOT NULL,
	`currency` char(3) NOT NULL,
	`status` varchar(20) NOT NULL,
	`provider_reference` varchar(128),
	`provider_payment_id` varchar(128),
	`amount_refunded` int NOT NULL DEFAULT 0,
	`failure_reason` varchar(300),
	`paid_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `pay_provider_ref_uq` UNIQUE(`provider`,`provider_reference`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`key` varchar(64) NOT NULL,
	`resource` varchar(32) NOT NULL,
	`action` varchar(32) NOT NULL,
	`description` varchar(200) NOT NULL DEFAULT '',
	CONSTRAINT `permissions_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `policy_pages` (
	`slug` varchar(64) NOT NULL,
	`title` varchar(200) NOT NULL,
	`intro` varchar(500) NOT NULL DEFAULT '',
	`sections` json NOT NULL,
	`updated_by` varchar(64),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `policy_pages_slug` PRIMARY KEY(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_attribute_values` (
	`id` varchar(64) NOT NULL,
	`attribute_id` varchar(64) NOT NULL,
	`value` varchar(80) NOT NULL,
	`label` varchar(80) NOT NULL,
	`hex` varchar(9),
	`family` varchar(80),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_attribute_values_id` PRIMARY KEY(`id`),
	CONSTRAINT `attr_value_uq` UNIQUE(`attribute_id`,`value`)
);
--> statement-breakpoint
CREATE TABLE `product_attributes` (
	`id` varchar(64) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(60) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_attributes_id` PRIMARY KEY(`id`),
	CONSTRAINT `attr_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`product_id` varchar(64) NOT NULL,
	`category_id` varchar(64) NOT NULL,
	CONSTRAINT `product_categories_product_id_category_id_pk` PRIMARY KEY(`product_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `product_collections` (
	`product_id` varchar(64) NOT NULL,
	`collection_id` varchar(64) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_collections_product_id_collection_id_pk` PRIMARY KEY(`product_id`,`collection_id`)
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` varchar(64) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`media_id` varchar(64) NOT NULL,
	`colour_value_id` varchar(64),
	`alt` varchar(300),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_prices` (
	`product_id` varchar(64) NOT NULL,
	`currency` char(3) NOT NULL,
	`price` int NOT NULL,
	`compare_at_price` int,
	CONSTRAINT `product_prices_product_id_currency_pk` PRIMARY KEY(`product_id`,`currency`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` varchar(64) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`sku` varchar(80) NOT NULL,
	`colour_value_id` varchar(64),
	`size_value_id` varchar(64),
	`cost_price` int,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `variant_sku_uq` UNIQUE(`sku`),
	CONSTRAINT `variant_combo_uq` UNIQUE(`product_id`,`colour_value_id`,`size_value_id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(64) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`sku` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`subtitle` varchar(200) NOT NULL DEFAULT '',
	`short_description` varchar(400) NOT NULL DEFAULT '',
	`description` text NOT NULL,
	`category_id` varchar(64),
	`size_guide_id` varchar(64),
	`fabric` varchar(255) NOT NULL DEFAULT '',
	`care` json NOT NULL,
	`details` json NOT NULL,
	`fit` varchar(255),
	`tags` json NOT NULL,
	`occasions` json NOT NULL,
	`status` varchar(12) NOT NULL DEFAULT 'draft',
	`publish_at` datetime(3),
	`is_new` boolean NOT NULL DEFAULT false,
	`is_featured` boolean NOT NULL DEFAULT false,
	`is_bestseller` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`seo_title` varchar(160),
	`seo_description` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`deleted_at` datetime(3),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_slug_uq` UNIQUE(`slug`),
	CONSTRAINT `product_sku_uq` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `promotional_campaigns` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`coupon_id` varchar(64),
	`collection_id` varchar(64),
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`status` varchar(12) NOT NULL DEFAULT 'draft',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `promotional_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` varchar(191) NOT NULL,
	`count` int NOT NULL,
	`window_start` datetime(3) NOT NULL,
	CONSTRAINT `rate_limits_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `recently_viewed_products` (
	`user_id` varchar(64) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`viewed_at` datetime(3) NOT NULL,
	CONSTRAINT `recently_viewed_products_user_id_product_id_pk` PRIMARY KEY(`user_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`payment_id` varchar(64),
	`return_id` varchar(64),
	`amount` int NOT NULL,
	`currency` char(3) NOT NULL,
	`method` varchar(12) NOT NULL,
	`status` varchar(12) NOT NULL,
	`reason` varchar(500) NOT NULL,
	`provider_refund_id` varchar(128),
	`restock` boolean NOT NULL DEFAULT false,
	`staff_user_id` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `related_products` (
	`product_id` varchar(64) NOT NULL,
	`related_id` varchar(64) NOT NULL,
	`kind` varchar(12) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `related_products_product_id_related_id_kind_pk` PRIMARY KEY(`product_id`,`related_id`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` varchar(64) NOT NULL,
	`return_id` varchar(64) NOT NULL,
	`order_item_id` varchar(64) NOT NULL,
	`quantity` int NOT NULL,
	`condition` varchar(12) NOT NULL,
	`restocked` boolean NOT NULL DEFAULT false,
	CONSTRAINT `return_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`number` varchar(24) NOT NULL,
	`status` varchar(12) NOT NULL,
	`reason` varchar(500) NOT NULL,
	`staff_user_id` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `returns_id` PRIMARY KEY(`id`),
	CONSTRAINT `return_number_uq` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` varchar(64) NOT NULL,
	`permission_key` varchar(64) NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_key_pk` PRIMARY KEY(`role_id`,`permission_key`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(64) NOT NULL,
	`key` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(300) NOT NULL DEFAULT '',
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_key_uq` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `sequences` (
	`name` varchar(32) NOT NULL,
	`value` int NOT NULL,
	CONSTRAINT `sequences_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `shipment_events` (
	`id` varchar(64) NOT NULL,
	`shipment_id` varchar(64) NOT NULL,
	`status` varchar(16) NOT NULL,
	`description` varchar(300) NOT NULL,
	`location` varchar(120),
	`occurred_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `shipment_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`carrier` varchar(60) NOT NULL,
	`tracking_number` varchar(80) NOT NULL,
	`tracking_url` varchar(512),
	`status` varchar(16) NOT NULL,
	`shipped_at` datetime(3),
	`delivered_at` datetime(3),
	`staff_user_id` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_methods` (
	`id` varchar(64) NOT NULL,
	`zone_id` varchar(64) NOT NULL,
	`label` varchar(80) NOT NULL,
	`description` varchar(200) NOT NULL DEFAULT '',
	`carrier` varchar(60) NOT NULL DEFAULT '',
	`currency` char(3) NOT NULL,
	`rate` int NOT NULL,
	`free_over` int,
	`cod_available` boolean NOT NULL DEFAULT false,
	`min_days` int NOT NULL DEFAULT 2,
	`max_days` int NOT NULL DEFAULT 5,
	`cities` json NOT NULL,
	`tracking_url_template` varchar(255),
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `shipping_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_zones` (
	`id` varchar(64) NOT NULL,
	`name` varchar(80) NOT NULL,
	`market_id` varchar(64) NOT NULL,
	`countries` json NOT NULL,
	`cities` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `shipping_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `size_guides` (
	`id` varchar(64) NOT NULL,
	`name` varchar(80) NOT NULL,
	`rows` json NOT NULL,
	`notes` text,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `size_guides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_role_assignments` (
	`staff_user_id` varchar(64) NOT NULL,
	`role_id` varchar(64) NOT NULL,
	`assigned_by` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `staff_role_assignments_staff_user_id_role_id_pk` PRIMARY KEY(`staff_user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `staff_users` (
	`id` varchar(64) NOT NULL,
	`email` varchar(254) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255),
	`status` varchar(12) NOT NULL DEFAULT 'invited',
	`is_super_admin` boolean NOT NULL DEFAULT false,
	`last_login_at` datetime(3),
	`failed_login_count` int NOT NULL DEFAULT 0,
	`locked_until` datetime(3),
	`invited_by` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `staff_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `static_pages` (
	`id` varchar(64) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`status` varchar(12) NOT NULL DEFAULT 'draft',
	`seo_title` varchar(160),
	`seo_description` varchar(320),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `static_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_slug_uq` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` varchar(64) NOT NULL,
	`reason` varchar(24) NOT NULL,
	`note` varchar(500) NOT NULL DEFAULT '',
	`staff_user_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_reservations` (
	`id` varchar(64) NOT NULL,
	`variant_id` varchar(64) NOT NULL,
	`order_id` varchar(64) NOT NULL,
	`quantity` int NOT NULL,
	`status` varchar(12) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_by` varchar(64),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `store_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `tax_settings` (
	`id` varchar(64) NOT NULL,
	`country_code` varchar(2) NOT NULL,
	`label` varchar(40) NOT NULL,
	`rate_bps` int NOT NULL DEFAULT 0,
	`inclusive` boolean NOT NULL DEFAULT true,
	`duties_on_delivery` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `tax_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `tax_country_uq` UNIQUE(`country_code`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` varchar(64) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`subject` varchar(8) NOT NULL,
	`user_id` varchar(64),
	`staff_user_id` varchar(64),
	`ip` varchar(64),
	`user_agent` varchar(255),
	`expires_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_uq` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password_hash` varchar(255),
	`first_name` varchar(80) NOT NULL,
	`last_name` varchar(80) NOT NULL,
	`phone` varchar(32),
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`email_verified_at` datetime(3),
	`marketing_consent` boolean NOT NULL DEFAULT false,
	`last_login_at` datetime(3),
	`failed_login_count` int NOT NULL DEFAULT 0,
	`locked_until` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `variant_prices` (
	`variant_id` varchar(64) NOT NULL,
	`currency` char(3) NOT NULL,
	`price` int NOT NULL,
	`compare_at_price` int,
	CONSTRAINT `variant_prices_variant_id_currency_pk` PRIMARY KEY(`variant_id`,`currency`)
);
--> statement-breakpoint
CREATE TABLE `wishlist_items` (
	`wishlist_id` varchar(64) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `wishlist_items_wishlist_id_product_id_pk` PRIMARY KEY(`wishlist_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` varchar(64) NOT NULL,
	`token_hash` char(64),
	`user_id` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `wish_token_uq` UNIQUE(`token_hash`),
	CONSTRAINT `wish_user_uq` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `abandoned_carts` ADD CONSTRAINT `abandoned_carts_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_deletion_requests` ADD CONSTRAINT `account_deletion_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `banners` ADD CONSTRAINT `banners_image_id_media_assets_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_image_id_media_assets_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_banner_id_media_assets_id_fk` FOREIGN KEY (`banner_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collections` ADD CONSTRAINT `collections_hero_id_media_assets_id_fk` FOREIGN KEY (`hero_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `countries` ADD CONSTRAINT `countries_market_id_markets_id_fk` FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_profiles` ADD CONSTRAINT `customer_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_notification_id_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_section_items` ADD CONSTRAINT `homepage_section_items_section_id_homepage_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `homepage_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_section_items` ADD CONSTRAINT `homepage_section_items_image_id_media_assets_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_section_items` ADD CONSTRAINT `homepage_section_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_section_items` ADD CONSTRAINT `homepage_section_items_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_sections` ADD CONSTRAINT `homepage_sections_image_id_media_assets_id_fk` FOREIGN KEY (`image_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_sections` ADD CONSTRAINT `homepage_sections_mobile_image_id_media_assets_id_fk` FOREIGN KEY (`mobile_image_id`) REFERENCES `media_assets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_adjustment_id_stock_adjustments_id_fk` FOREIGN KEY (`adjustment_id`) REFERENCES `stock_adjustments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `markets` ADD CONSTRAINT `markets_currency_currencies_code_fk` FOREIGN KEY (`currency`) REFERENCES `currencies`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `navigation_items` ADD CONSTRAINT `navigation_items_menu_id_navigation_menus_id_fk` FOREIGN KEY (`menu_id`) REFERENCES `navigation_menus`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_addresses` ADD CONSTRAINT `order_addresses_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_notes` ADD CONSTRAINT `order_notes_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_attribute_values` ADD CONSTRAINT `product_attribute_values_attribute_id_product_attributes_id_fk` FOREIGN KEY (`attribute_id`) REFERENCES `product_attributes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_collections` ADD CONSTRAINT `product_collections_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_collections` ADD CONSTRAINT `product_collections_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_media_id_media_assets_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media_assets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_colour_value_id_product_attribute_values_id_fk` FOREIGN KEY (`colour_value_id`) REFERENCES `product_attribute_values`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_prices` ADD CONSTRAINT `product_prices_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_prices` ADD CONSTRAINT `product_prices_currency_currencies_code_fk` FOREIGN KEY (`currency`) REFERENCES `currencies`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_colour_value_id_product_attribute_values_id_fk` FOREIGN KEY (`colour_value_id`) REFERENCES `product_attribute_values`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_size_value_id_product_attribute_values_id_fk` FOREIGN KEY (`size_value_id`) REFERENCES `product_attribute_values`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_size_guide_id_size_guides_id_fk` FOREIGN KEY (`size_guide_id`) REFERENCES `size_guides`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotional_campaigns` ADD CONSTRAINT `promotional_campaigns_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotional_campaigns` ADD CONSTRAINT `promotional_campaigns_collection_id_collections_id_fk` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed_products` ADD CONSTRAINT `recently_viewed_products_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed_products` ADD CONSTRAINT `recently_viewed_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_return_id_returns_id_fk` FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `related_products` ADD CONSTRAINT `related_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `related_products` ADD CONSTRAINT `related_products_related_id_products_id_fk` FOREIGN KEY (`related_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_return_id_returns_id_fk` FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_order_item_id_order_items_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_key_permissions_key_fk` FOREIGN KEY (`permission_key`) REFERENCES `permissions`(`key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment_events` ADD CONSTRAINT `shipment_events_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipping_methods` ADD CONSTRAINT `shipping_methods_zone_id_shipping_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipping_methods` ADD CONSTRAINT `shipping_methods_currency_currencies_code_fk` FOREIGN KEY (`currency`) REFERENCES `currencies`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipping_zones` ADD CONSTRAINT `shipping_zones_market_id_markets_id_fk` FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_role_assignments` ADD CONSTRAINT `staff_role_assignments_staff_user_id_staff_users_id_fk` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_role_assignments` ADD CONSTRAINT `staff_role_assignments_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_reservations` ADD CONSTRAINT `stock_reservations_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_staff_user_id_staff_users_id_fk` FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_prices` ADD CONSTRAINT `variant_prices_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variant_prices` ADD CONSTRAINT `variant_prices_currency_currencies_code_fk` FOREIGN KEY (`currency`) REFERENCES `currencies`(`code`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_wishlist_id_wishlists_id_fk` FOREIGN KEY (`wishlist_id`) REFERENCES `wishlists`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlist_items` ADD CONSTRAINT `wishlist_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `cart_user_idx` ON `carts` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `cart_updated_idx` ON `carts` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `contact_status_idx` ON `contact_messages` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `countries_market_idx` ON `countries` (`market_id`);--> statement-breakpoint
CREATE INDEX `redemption_coupon_idx` ON `coupon_redemptions` (`coupon_id`,`email`);--> statement-breakpoint
CREATE INDEX `addr_user_idx` ON `customer_addresses` (`user_id`);--> statement-breakpoint
CREATE INDEX `cnote_user_idx` ON `customer_notes` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_created_idx` ON `email_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `email_to_idx` ON `email_logs` (`to_address`);--> statement-breakpoint
CREATE INDEX `hsi_section_idx` ON `homepage_section_items` (`section_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `inv_mov_variant_idx` ON `inventory_movements` (`variant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inv_mov_order_idx` ON `inventory_movements` (`order_id`);--> statement-breakpoint
CREATE INDEX `media_folder_idx` ON `media_assets` (`folder`);--> statement-breakpoint
CREATE INDEX `media_created_idx` ON `media_assets` (`created_at`);--> statement-breakpoint
CREATE INDEX `navitem_menu_idx` ON `navigation_items` (`menu_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `notif_status_idx` ON `notifications` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `notif_order_idx` ON `notifications` (`order_id`);--> statement-breakpoint
CREATE INDEX `oi_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `oi_product_idx` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `onote_order_idx` ON `order_notes` (`order_id`);--> statement-breakpoint
CREATE INDEX `osh_order_idx` ON `order_status_history` (`order_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `order_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `order_email_idx` ON `orders` (`email`);--> statement-breakpoint
CREATE INDEX `order_placed_idx` ON `orders` (`placed_at`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `orders` (`status`,`placed_at`);--> statement-breakpoint
CREATE INDEX `order_paystatus_idx` ON `orders` (`payment_status`);--> statement-breakpoint
CREATE INDEX `ptx_payment_idx` ON `payment_transactions` (`payment_id`);--> statement-breakpoint
CREATE INDEX `webhook_received_idx` ON `payment_webhook_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `pay_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `pay_status_idx` ON `payments` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `pc_category_idx` ON `product_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `pcol_collection_idx` ON `product_collections` (`collection_id`);--> statement-breakpoint
CREATE INDEX `pimg_product_idx` ON `product_images` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `pimg_media_idx` ON `product_images` (`media_id`);--> statement-breakpoint
CREATE INDEX `price_currency_idx` ON `product_prices` (`currency`,`price`);--> statement-breakpoint
CREATE INDEX `variant_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `products` (`status`,`publish_at`);--> statement-breakpoint
CREATE INDEX `product_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_created_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX `rv_user_idx` ON `recently_viewed_products` (`user_id`,`viewed_at`);--> statement-breakpoint
CREATE INDEX `refund_order_idx` ON `refunds` (`order_id`);--> statement-breakpoint
CREATE INDEX `refund_created_idx` ON `refunds` (`created_at`);--> statement-breakpoint
CREATE INDEX `return_order_idx` ON `returns` (`order_id`);--> statement-breakpoint
CREATE INDEX `sev_ship_idx` ON `shipment_events` (`shipment_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `ship_order_idx` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE INDEX `ship_tracking_idx` ON `shipments` (`tracking_number`);--> statement-breakpoint
CREATE INDEX `ship_zone_idx` ON `shipping_methods` (`zone_id`);--> statement-breakpoint
CREATE INDEX `resv_order_idx` ON `stock_reservations` (`order_id`);--> statement-breakpoint
CREATE INDEX `resv_status_idx` ON `stock_reservations` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_staff_idx` ON `user_sessions` (`staff_user_id`);--> statement-breakpoint
CREATE INDEX `users_created_idx` ON `users` (`created_at`);