

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."reservation_status" AS ENUM (
    'reserved',
    'expired',
    'finalized'
);


ALTER TYPE "public"."reservation_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_review"("input_product_id" bigint, "input_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  has_purchased BOOLEAN;
  already_reviewed BOOLEAN;
BEGIN
  -- Verifica si ya hizo un review
  SELECT EXISTS (
    SELECT 1 FROM reviews
    WHERE product_id = input_product_id
      AND user_id = input_user_id
  ) INTO already_reviewed;

  IF already_reviewed THEN
    RETURN FALSE;
  END IF;

  -- Verifica si ha comprado
  SELECT EXISTS (
    SELECT 1
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = input_user_id
      AND o.status = 'pagado'
      AND oi.product_id = input_product_id
  ) INTO has_purchased;

  -- Devuelve NULL si no ha comprado (en lugar de FALSE)
  IF NOT has_purchased THEN
    RETURN NULL;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."can_user_review"("input_product_id" bigint, "input_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_role"("user_id" "uuid", "allowed_roles" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_roles.user_id = check_user_role.user_id 
    AND user_roles.role = ANY(allowed_roles)
  );
END;
$$;


ALTER FUNCTION "public"."check_user_role"("user_id" "uuid", "allowed_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_orphan_checkout_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE reservations
  SET checkout_session_id = NULL
  WHERE checkout_session_id IS NOT NULL
    AND status = 'reserved'
    AND expires_at < now();  -- checkout ya debía haber finalizado

END;
$$;


ALTER FUNCTION "public"."clean_orphan_checkout_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_reservations_for_order"("p_items" "jsonb", "p_order_id" bigint, "p_checkout_session_id" "text", "p_expires_at" timestamp with time zone) RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  it jsonb;
  product_id bigint;
  variant_id bigint;
  qty integer;
  available integer;
BEGIN
  IF p_checkout_session_id IS NULL THEN
    RETURN QUERY SELECT false, 'checkout_session_id es requerido';
    RETURN;
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    product_id := (it->>'product_id')::bigint;
    variant_id := CASE 
      WHEN it ? 'variant_id' AND (it->>'variant_id') <> '' 
      THEN (it->>'variant_id')::bigint 
      ELSE NULL 
    END;

    qty := (it->>'quantity')::integer;

    -- 🔒 Bloqueo y validación de stock
    IF variant_id IS NOT NULL THEN
      SELECT stock INTO available 
      FROM public.product_variants 
      WHERE id = variant_id 
      FOR UPDATE;

      IF available IS NULL THEN
        RETURN QUERY SELECT false, 'Variant not found: ' || variant_id;
        RETURN;
      END IF;

      IF available < qty THEN
        RETURN QUERY SELECT false, 'Stock insuficiente para variant ' || variant_id;
        RETURN;
      END IF;

    ELSE
      SELECT stock INTO available 
      FROM public.products 
      WHERE id = product_id 
      FOR UPDATE;

      IF available IS NULL THEN
        RETURN QUERY SELECT false, 'Product not found: ' || product_id;
        RETURN;
      END IF;

      IF available < qty THEN
        RETURN QUERY SELECT false, 'Stock insuficiente para product ' || product_id;
        RETURN;
      END IF;
    END IF;

    -- ✅ AQUÍ ESTABA EL ERROR: faltaba el status = 'reserved'
    INSERT INTO public.reservations (
      order_id,
      checkout_session_id,
      product_id,
      variant_id,
      quantity,
      expires_at,
      status,
      reserved_at
    )
    VALUES (
      p_order_id,
      p_checkout_session_id,
      product_id,
      variant_id,
      qty,
      p_expires_at,
      'reserved',
      now()
    );

  END LOOP;

  RETURN QUERY SELECT true, 'Reservas creadas exitosamente';
END;
$$;


ALTER FUNCTION "public"."create_reservations_for_order"("p_items" "jsonb", "p_order_id" bigint, "p_checkout_session_id" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_product_stock"("product_id" bigint, "amount" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  current_stock integer;
begin
  select stock into current_stock from products where id = product_id;

  if current_stock is null then
    raise exception 'Producto con ID % no encontrado.', product_id;
  end if;

  if current_stock < amount then
    raise exception 'Stock insuficiente para producto ID %: disponible %, solicitado %.', product_id, current_stock, amount;
  end if;

  update products
  set stock = stock - amount,
      updated_at = now()
  where id = product_id;
end;
$$;


ALTER FUNCTION "public"."decrement_product_stock"("product_id" bigint, "amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_variant_stock"("variant_id" bigint, "amount" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  current_stock integer;
begin
  select stock into current_stock from product_variants where id = variant_id;

  if current_stock is null then
    raise exception 'Variante con ID % no encontrada.', variant_id;
  end if;

  if current_stock < amount then
    raise exception 'Stock insuficiente para variante ID %: disponible %, solicitado %.', variant_id, current_stock, amount;
  end if;

  update product_variants
  set stock = stock - amount
  where id = variant_id;
end;
$$;


ALTER FUNCTION "public"."decrement_variant_stock"("variant_id" bigint, "amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_max_4_addresses"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_addresses WHERE user_id = NEW.user_id) >= 4 THEN
    RAISE EXCEPTION 'El usuario % ya tiene 4 direcciones registradas.', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_max_4_addresses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_reservations_for_order"("p_order_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  r RECORD;
  v_price numeric;
  v_count integer;
BEGIN
  RAISE NOTICE 'INICIANDO finalize_reservations_for_order PARA ORDEN %', p_order_id;

  SELECT COUNT(*) INTO v_count
  FROM public.order_items
  WHERE order_id = p_order_id;

  IF v_count > 0 THEN
    RAISE NOTICE 'Order items ya existen';
    RETURN;
  END IF;

  FOR r IN
    SELECT *
    FROM public.reservations
    WHERE order_id = p_order_id
      AND status = 'reserved'
      AND expires_at > now()
    FOR UPDATE
  LOOP
    RAISE NOTICE 'Procesando reserva %', r.id;

    IF r.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
      SET stock = stock - r.quantity
      WHERE id = r.variant_id;

      SELECT price INTO v_price
      FROM public.product_variants
      WHERE id = r.variant_id;
    ELSE
      UPDATE public.products
      SET stock = stock - r.quantity
      WHERE id = r.product_id;

      SELECT price INTO v_price
      FROM public.products
      WHERE id = r.product_id;
    END IF;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      price,
      created_at
    )
    VALUES (
      p_order_id,
      r.product_id,
      r.variant_id,
      r.quantity,
      COALESCE(v_price, 0),
      now()
    );

    UPDATE public.reservations
    SET status = 'finalized',
        finalized_at = now()
    WHERE id = r.id;

  END LOOP;

  RAISE NOTICE 'FINALIZADO OK';

END;
$$;


ALTER FUNCTION "public"."finalize_reservations_for_order"("p_order_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_courier_performance"("p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("courier_id" bigint, "courier_name" "text", "total_orders" bigint, "total_sales" numeric, "total_returns" bigint, "return_rate_percentage" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    c.id AS courier_id,
    c.name AS courier_name,
    COUNT(o.id) AS total_orders,
    SUM(o.total) AS total_sales,
    SUM(CASE WHEN o.return_status != 'none' THEN 1 ELSE 0 END) AS total_returns,
    ROUND(
      CASE WHEN COUNT(o.id) > 0
      THEN (SUM(CASE WHEN o.return_status != 'none' THEN 1 ELSE 0 END)::numeric / COUNT(o.id)) * 100
      ELSE 0 END, 2
    ) AS return_rate_percentage
  FROM public.couriers c
  LEFT JOIN public.orders o ON o.courier_id = c.id
  WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
  AND (
    (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  )
  GROUP BY c.id, c.name
  ORDER BY total_orders DESC;
$$;


ALTER FUNCTION "public"."fn_courier_performance"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_order_items_detailed"() RETURNS TABLE("order_item_id" bigint, "order_id" bigint, "product_id" bigint, "product_name" "text", "category_id" integer, "category_name" "text", "variant_id" bigint, "variant_name" "text", "quantity" integer, "price" numeric, "total_price" numeric, "user_id" "uuid", "order_status" character varying, "order_date" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT
      oi.id AS order_item_id,
      oi.order_id,
      oi.product_id,
      p.name AS product_name,
      p.category_id,
      cat.name AS category_name,
      oi.variant_id,
      pv.name AS variant_name,
      oi.quantity,
      oi.price,
      (oi.quantity * oi.price) AS total_price,
      o.user_id,
      o.status AS order_status,
      o.created_at AS order_date
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    JOIN public.products p ON oi.product_id = p.id
    LEFT JOIN public.product_variants pv ON oi.variant_id = pv.id
    LEFT JOIN public.categories cat ON p.category_id = cat.id
    WHERE EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    );
$$;


ALTER FUNCTION "public"."fn_order_items_detailed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_orders_detailed"() RETURNS TABLE("order_id" bigint, "user_id" "uuid", "total" numeric, "status" "text", "tracking_code" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "return_status" "text", "is_submitted" boolean, "submitted_at" timestamp with time zone, "courier_id" bigint, "courier_name" "text", "courier_url" "text", "courier_logo" "text", "shipping_label" "text", "shipping_name" "text", "shipping_phone" "text", "shipping_address_line1" "text", "shipping_address_line2" "text", "shipping_city" "text", "shipping_state" "text", "shipping_postal_code" "text", "shipping_country" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    o.id AS order_id,
    o.user_id,
    o.total,
    o.status,
    o.tracking_code,
    o.created_at,
    o.updated_at,
    o.return_status,
    o.is_submitted,
    o.submitted_at,
    o.courier_id,
    c.name AS courier_name,
    c.url AS courier_url,
    c.logo AS courier_logo,
    ua.label AS shipping_label,
    ua.name AS shipping_name,
    ua.phone AS shipping_phone,
    ua.address_line1 AS shipping_address_line1,
    ua.address_line2 AS shipping_address_line2,
    ua.city AS shipping_city,
    ua.state AS shipping_state,
    ua.postal_code AS shipping_postal_code,
    ua.country AS shipping_country
  FROM public.orders o
  LEFT JOIN public.couriers c ON o.courier_id = c.id
  LEFT JOIN public.user_addresses ua ON ua.id = o.shipping_address_id
  WHERE EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  );
$$;


ALTER FUNCTION "public"."fn_orders_detailed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_returns_detailed"() RETURNS TABLE("return_id" bigint, "order_id" bigint, "admin_id" "uuid", "reason" "text", "refund_amount" numeric, "refund_type" character varying, "return_status" "text", "stripe_refund_id" "text", "returned_at" timestamp with time zone, "processed_at" timestamp with time zone, "order_total" numeric, "order_status" character varying, "admin_email" "text", "items_data" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT
      r.id AS return_id,
      r.order_id,
      r.admin_id,
      r.reason,
      r.refund_amount,
      r.refund_type,
      r.status AS return_status,
      r.stripe_refund_id,
      r.returned_at,
      r.processed_at,
      o.total AS order_total,
      o.status AS order_status,
      u.email AS admin_email,
      r.items_data
    FROM public.returns r
    LEFT JOIN public.orders o ON r.order_id = o.id
    LEFT JOIN auth.users u ON r.admin_id = u.id
    WHERE EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    );
$$;


ALTER FUNCTION "public"."fn_returns_detailed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sales_summary_financial"("p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("date" "date", "total_orders" bigint, "total_sales" numeric, "total_returns" bigint, "total_platform_fee" numeric, "total_jeweler_earnings" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$SELECT
    DATE_TRUNC('day', o.created_at)::date AS date,
    COUNT(o.id) AS total_orders,
    SUM(o.total) AS total_sales,
    SUM(CASE WHEN o.return_status != 'none' THEN 1 ELSE 0 END) AS total_returns,
    COALESCE(SUM(t.platform_fee), 0) AS total_platform_fee,
    COALESCE(SUM(t.jeweler_earnings), 0) AS total_jeweler_earnings
  FROM public.orders o
  LEFT JOIN public.transactions t ON o.id = t.order_id
  WHERE o.status NOT IN ('cancelado', 'reserved')
    AND EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    AND (
      (p_start_date IS NULL OR o.created_at >= p_start_date)
      AND (p_end_date IS NULL OR o.created_at <= p_end_date)
    )
  GROUP BY DATE_TRUNC('day', o.created_at)
  ORDER BY DATE_TRUNC('day', o.created_at) DESC;$$;


ALTER FUNCTION "public"."fn_sales_summary_financial"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sales_summary_simple"("p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("date" "date", "total_orders" bigint, "total_sales" numeric, "avg_order_value" numeric, "unique_customers" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$SELECT
    DATE_TRUNC('day', o.created_at)::date AS date,
    COUNT(o.id) AS total_orders,
    SUM(o.total) AS total_sales,
    ROUND(AVG(o.total), 2) AS avg_order_value,
    COUNT(DISTINCT o.user_id) AS unique_customers
  FROM public.orders o
  WHERE o.status NOT IN ('cancelado', 'devuelto', 'parcialmente_devuelto', 'reembolsado', 'reserved')
    AND EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    AND (
      (p_start_date IS NULL OR o.created_at >= p_start_date)
      AND (p_end_date IS NULL OR o.created_at <= p_end_date)
    )
  GROUP BY DATE_TRUNC('day', o.created_at)
  ORDER BY date DESC;$$;


ALTER FUNCTION "public"."fn_sales_summary_simple"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_shipping_summary"("p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("courier_name" "text", "total_shipments" bigint, "shipped_orders" bigint, "pending_orders" bigint, "delivered_orders" bigint, "returns_related" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    c.name AS courier_name,
    COUNT(o.id) AS total_shipments,
    SUM(CASE WHEN o.status = 'enviado' THEN 1 ELSE 0 END) AS shipped_orders,
    SUM(CASE WHEN o.status = 'pendiente' THEN 1 ELSE 0 END) AS pending_orders,
    SUM(CASE WHEN o.status = 'entregado' THEN 1 ELSE 0 END) AS delivered_orders,
    SUM(CASE WHEN o.return_status != 'none' THEN 1 ELSE 0 END) AS returns_related
  FROM public.orders o
  LEFT JOIN public.couriers c ON o.courier_id = c.id
  WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
  AND (
    (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  )
  GROUP BY c.name
  ORDER BY total_shipments DESC;
$$;


ALTER FUNCTION "public"."fn_shipping_summary"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_return"("order_id_param" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Restaurar stock
  UPDATE product_variants pv
  SET stock = pv.stock + oi.quantity
  FROM order_items oi
  WHERE oi.order_id = order_id_param AND oi.variant_id = pv.id;
  
  UPDATE products p
  SET stock = p.stock + oi.quantity
  FROM order_items oi
  WHERE oi.order_id = order_id_param AND oi.product_id = p.id AND oi.variant_id IS NULL;
  
  -- Marcar orden como devuelta
  UPDATE orders 
  SET status = 'devuelto', return_status = 'returned'
  WHERE id = order_id_param;
END;
$$;


ALTER FUNCTION "public"."process_return"("order_id_param" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_return_items" "jsonb", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_stripe_refund_id" "text") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$DECLARE
  r_record RECORD;
  tx_record RECORD;
  processed_sum numeric := 0;
  platform_pct numeric := NULL;
  original_amount numeric := 0;
  new_platform_fee numeric;
  new_jeweler_earnings numeric;
  item jsonb;
  v_qty int;
  v_variant_id bigint;
  v_product_id bigint;
BEGIN
  -- 1) Lock the return row and ensure it's pending
  SELECT * INTO r_record
  FROM public.returns
  WHERE id = p_return_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Return not found';
    RETURN;
  END IF;

  IF r_record.status IS DISTINCT FROM 'pending' THEN
    RETURN QUERY SELECT false, 'Return is not pending (current status: ' || COALESCE(r_record.status, 'null') || ')';
    RETURN;
  END IF;

  -- 2) Determine order_id
  IF r_record.order_id IS NULL THEN
    RETURN QUERY SELECT false, 'Return has no order_id';
    RETURN;
  END IF;

  -- 3) Insert return_items (if provided and not refund_only)
  IF (NOT p_refund_only) AND p_return_items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_return_items)
    LOOP
      v_qty := COALESCE((item->>'quantity')::int, 0);
      v_variant_id := NULLIF((item->>'variant_id'), 'null')::bigint;
      v_product_id := NULLIF((item->>'product_id'), 'null')::bigint;

      IF v_qty <= 0 THEN
        RAISE EXCEPTION 'Invalid quantity in return_items: %', item;
      END IF;

      INSERT INTO public.return_items (
        return_id,
        order_item_id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        refund_amount,
        reason,
        created_at
      )
      VALUES (
        p_return_id,
        NULLIF(item->>'order_item_id','null')::bigint,
        v_product_id,
        v_variant_id,
        v_qty,
        NULLIF(item->>'unit_price','null')::numeric,
        NULLIF(item->>'refund_amount','null')::numeric,
        NULLIF(item->>'reason','null')::text,
        now()
      );
    END LOOP;
  END IF;

  -- 4) Restore stock for each return_item (if not refund_only)
  IF (NOT p_refund_only) THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_return_items) LOOP
      v_qty := COALESCE((item->>'quantity')::int, 0);
      v_variant_id := NULLIF((item->>'variant_id'), 'null')::bigint;
      v_product_id := NULLIF((item->>'product_id'), 'null')::bigint;

      IF v_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = stock + v_qty
        WHERE id = v_variant_id
        RETURNING id INTO v_variant_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Variant not found when restoring stock: %', (item->>'variant_id');
        END IF;

      ELSIF v_product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock = stock + v_qty
        WHERE id = v_product_id
        RETURNING id INTO v_product_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Product not found when restoring stock: %', (item->>'product_id');
        END IF;
      ELSE
        RAISE EXCEPTION 'Return item missing product_id and variant_id: %', item;
      END IF;
    END LOOP;
  END IF;

  -- 5) Adjust transactions (platform_fee / jeweler_earnings)
  SELECT * INTO tx_record
  FROM public.transactions
  WHERE order_id = r_record.order_id
  FOR UPDATE;

  IF FOUND THEN
    original_amount := COALESCE(tx_record.amount, 0);

    SELECT COALESCE(SUM(refund_amount),0) INTO processed_sum
    FROM public.returns
    WHERE order_id = r_record.order_id
      AND status = 'processed';

    processed_sum := processed_sum + COALESCE(p_refund_amount, 0);

    BEGIN
      IF tx_record.fee_details IS NOT NULL THEN
        platform_pct := (tx_record.fee_details ->> 'platform_percentage')::numeric / 100.0;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      platform_pct := NULL;
    END;

    IF original_amount > 0 AND platform_pct IS NOT NULL THEN
      new_platform_fee := platform_pct * GREATEST(0, original_amount - processed_sum);
      new_jeweler_earnings := GREATEST(0, original_amount - new_platform_fee);

      UPDATE public.transactions
      SET
        platform_fee = new_platform_fee,
        jeweler_earnings = new_jeweler_earnings
      WHERE id = tx_record.id;
    END IF;
  END IF;

  -- 6) Mark return as processed
  UPDATE public.returns
  SET
    stripe_refund_id = p_stripe_refund_id,
    status = 'processed',
    processed_at = now()
  WHERE id = p_return_id;

  -- ✅ 7) Update order return_status AND status (EN ESPAÑOL)
  UPDATE public.orders
  SET
    return_status = CASE
      WHEN p_refund_only OR p_refund_type = 'refund' THEN 'refund'
      WHEN p_refund_type = 'full' THEN 'returned'
      ELSE 'partial'
    END,
    status = CASE
      WHEN p_refund_only THEN 'reembolsado'
      WHEN p_refund_type = 'full' THEN 'devuelto'
      ELSE 'parcialmente_devuelto'
    END,
    updated_at = now()
  WHERE id = r_record.order_id;

  RETURN QUERY SELECT true, 'Return processed atomically';
  RETURN;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error processing return: ' || SQLERRM;
    RETURN;
END;$$;


ALTER FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_return_items" "jsonb", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_stripe_refund_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_stripe_refund_id" "text", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_return_items" "jsonb") RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  r_record RECORD;
  tx_record RECORD;
  processed_sum numeric := 0;
  platform_pct numeric := NULL;
  original_amount numeric := 0;
  new_platform_fee numeric;
  new_jeweler_earnings numeric;
  item jsonb;
  v_qty int;
  v_variant_id bigint;
  v_product_id bigint;
BEGIN
  -- 1) Bloquear return y validar que esté pendiente
  SELECT * INTO r_record
  FROM public.returns
  WHERE id = p_return_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Return not found';
    RETURN;
  END IF;

  IF r_record.status IS DISTINCT FROM 'pending' THEN
    RETURN QUERY SELECT false, 'Return is not pending (current: ' || COALESCE(r_record.status, 'null') || ')';
    RETURN;
  END IF;

  -- 2) Validar order_id
  IF r_record.order_id IS NULL THEN
    RETURN QUERY SELECT false, 'Return has no order_id';
    RETURN;
  END IF;

  -- 3) Insertar return_items
  IF (NOT p_refund_only) AND p_return_items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_return_items)
    LOOP
      v_qty := COALESCE((item->>'quantity')::int, 0);
      v_variant_id := NULLIF((item->>'variant_id'), 'null')::bigint;
      v_product_id := NULLIF((item->>'product_id'), 'null')::bigint;

      IF v_qty <= 0 THEN
        RAISE EXCEPTION 'Invalid quantity in return_items: %', item;
      END IF;

      INSERT INTO public.return_items (
        return_id,
        order_item_id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        refund_amount,
        reason,
        created_at
      )
      VALUES (
        p_return_id,
        NULLIF(item->>'order_item_id','null')::bigint,
        v_product_id,
        v_variant_id,
        v_qty,
        NULLIF(item->>'unit_price','null')::numeric,
        NULLIF(item->>'refund_amount','null')::numeric,
        NULLIF(item->>'reason','null')::text,
        now()
      );
    END LOOP;
  END IF;

  -- 4) Restaurar inventario
  IF (NOT p_refund_only) THEN
    FOR item IN SELECT * FROM jsonb_array_elements(p_return_items)
    LOOP
      v_qty := COALESCE((item->>'quantity')::int, 0);
      v_variant_id := NULLIF((item->>'variant_id'), 'null')::bigint;
      v_product_id := NULLIF((item->>'product_id'), 'null')::bigint;

      IF v_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET stock = stock + v_qty
        WHERE id = v_variant_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Variant not found restoring stock: %', v_variant_id;
        END IF;

      ELSIF v_product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock = stock + v_qty
        WHERE id = v_product_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Product not found restoring stock: %', v_product_id;
        END IF;

      ELSE
        RAISE EXCEPTION 'Invalid return item (no product or variant): %', item;
      END IF;
    END LOOP;
  END IF;

  -- 5) Ajustar transacción
  SELECT * INTO tx_record
  FROM public.transactions
  WHERE order_id = r_record.order_id
  FOR UPDATE;

  IF FOUND THEN
    original_amount := COALESCE(tx_record.amount, 0);

    SELECT COALESCE(SUM(refund_amount),0)
    INTO processed_sum
    FROM public.returns
    WHERE order_id = r_record.order_id
      AND status = 'processed';

    processed_sum := processed_sum + COALESCE(p_refund_amount, 0);

    BEGIN
      IF tx_record.fee_details IS NOT NULL THEN
        platform_pct := (tx_record.fee_details ->> 'platform_percentage')::numeric / 100.0;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      platform_pct := NULL;
    END;

    IF original_amount > 0 AND platform_pct IS NOT NULL THEN
      new_platform_fee := platform_pct * GREATEST(0, original_amount - processed_sum);
      new_jeweler_earnings := GREATEST(0, original_amount - new_platform_fee);

      UPDATE public.transactions
      SET
        platform_fee = new_platform_fee,
        jeweler_earnings = new_jeweler_earnings
      WHERE id = tx_record.id;
    END IF;
  END IF;

  -- 6) Marcar return como procesado
  UPDATE public.returns
  SET
    stripe_refund_id = p_stripe_refund_id,
    status = 'processed',
    processed_at = now()
  WHERE id = p_return_id;

  -- ✅ 7) ACTUALIZAR ORDEN SOLO CON ESTADOS EN ESPAÑOL
  UPDATE public.orders
  SET
    return_status = CASE
      WHEN p_refund_only OR p_refund_type = 'refund' THEN 'refund'
      WHEN p_refund_type = 'full' THEN 'returned'
      ELSE 'partial'
    END,
    status = CASE
      WHEN p_refund_only THEN 'reembolsado'
      WHEN p_refund_type = 'full' THEN 'devuelto'
      ELSE 'parcialmente_devuelto'
    END,
    updated_at = now()
  WHERE id = r_record.order_id;

  RETURN QUERY SELECT true, 'Return processed atomically';
  RETURN;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Error processing return: ' || SQLERRM;
    RETURN;
END;
$$;


ALTER FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_stripe_refund_id" "text", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_return_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_expired_reservations"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE reservations
  SET status = 'expired',
      released_at = now()
  WHERE status = 'reserved'
    AND expires_at < now();

  INSERT INTO cron_logs(task, executed_at)
  VALUES ('release_expired_reservations', now());
END;
$$;


ALTER FUNCTION "public"."release_expired_reservations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_reservations_for_order"("p_order_id" bigint) RETURNS TABLE("success" boolean, "message" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.reservations
  SET 
    status = 'expired',
    released_at = COALESCE(released_at, now())
  WHERE 
    order_id = p_order_id
    AND status = 'reserved';

  RETURN QUERY 
    SELECT true, 'Reservas liberadas para la orden ' || p_order_id;
END;
$$;


ALTER FUNCTION "public"."release_reservations_for_order"("p_order_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_inventory_after_cancel"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.variant_id IS NOT NULL THEN
    -- Es una variante
    UPDATE product_variants
    SET stock = stock + OLD.quantity
    WHERE id = OLD.variant_id;
  ELSE
    -- Es un producto simple
    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."restore_inventory_after_cancel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_abandoned_carts"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  response json;
begin
  -- Llama a la edge function vía HTTP
  select
    http(
      'https://xrtfrtiubugctntwbami.functions.supabase.co/abandoned-carts',
      'POST',
      '{}',
      'application/json'
    ) into response;
end;
$$;


ALTER FUNCTION "public"."run_abandoned_carts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_submitted_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_submitted = true AND OLD.is_submitted = false THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_submitted_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status NOT IN (
    'pendiente',
    'pagado',
    'procesando',
    'enviado',
    'entregado',
    'cancelado',
    'reembolsado',
    'devuelto',
    'parcialmente_devuelto',
    'disputa',
    'reserved'
  ) THEN
    RAISE EXCEPTION 'Estado de orden inválido: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_order_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_total_refund"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order_total numeric;
  v_total_refunded numeric;
BEGIN
  SELECT total
  INTO v_order_total
  FROM public.orders
  WHERE id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no existe: %', NEW.order_id;
  END IF;

  SELECT COALESCE(SUM(refund_amount), 0)
  INTO v_total_refunded
  FROM public.returns
  WHERE order_id = NEW.order_id
    AND status = 'processed'; -- solo devoluciones ya procesadas

  IF TG_OP = 'UPDATE' THEN
    v_total_refunded := v_total_refunded - COALESCE(OLD.refund_amount, 0);
  END IF;

  v_total_refunded := v_total_refunded + COALESCE(NEW.refund_amount, 0);

  IF v_total_refunded > v_order_total THEN
    RAISE EXCEPTION
      'Total reembolsado excede el total de la orden. Total: %, Reembolsos: %',
      v_order_total, v_total_refunded;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_order_total_refund"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_return_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_sold_qty integer;
  v_returned_qty integer;
  v_unit_price numeric;
BEGIN
  -- Validar que el order_item exista
  SELECT quantity, price
  INTO v_sold_qty, v_unit_price
  FROM public.order_items
  WHERE id = NEW.order_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_item no existe: %', NEW.order_item_id;
  END IF;

  -- Total ya devuelto
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_returned_qty
  FROM public.return_items
  WHERE order_item_id = NEW.order_item_id;

  -- No permitir devolver más de lo comprado
  IF (v_returned_qty + NEW.quantity) > v_sold_qty THEN
    RAISE EXCEPTION
      'Cantidad de devolución excede lo comprado. Vendido: %, Ya devuelto: %, Intento: %',
      v_sold_qty, v_returned_qty, NEW.quantity;
  END IF;

  -- No permitir refund mayor al valor del producto
  IF NEW.refund_amount IS NOT NULL
     AND NEW.refund_amount > (v_unit_price * NEW.quantity) THEN
    RAISE EXCEPTION
      'Refund excede el máximo permitido. Máx: %, Enviado: %',
      v_unit_price * NEW.quantity, NEW.refund_amount;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_return_item"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "name" character varying(255),
    "address_line1" character varying(255),
    "address_line2" character varying(255),
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(100),
    "phone" character varying(30),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "order_id" bigint
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."addresses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."addresses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."addresses_id_seq" OWNED BY "public"."addresses"."id";



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'customer'::character varying NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_users" AS
 SELECT "user_id"
   FROM "public"."user_roles"
  WHERE (("role")::"text" = 'admin'::"text");


ALTER VIEW "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" bigint NOT NULL,
    "cart_user_id" "uuid",
    "product_id" bigint,
    "variant_id" bigint,
    "quantity" integer DEFAULT 1 NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cart_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cart_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cart_items_id_seq" OWNED BY "public"."cart_items"."id";



CREATE TABLE IF NOT EXISTS "public"."cart_reminders" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cart_data" "jsonb" NOT NULL
);


ALTER TABLE "public"."cart_reminders" OWNER TO "postgres";


ALTER TABLE "public"."cart_reminders" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cart_reminders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."carts" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "items" json
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."couriers" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "url" "text",
    "logo" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."couriers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."couriers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."couriers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."couriers_id_seq" OWNED BY "public"."couriers"."id";



CREATE TABLE IF NOT EXISTS "public"."emails" (
    "id" bigint NOT NULL,
    "to_email" "text" NOT NULL,
    "from_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


ALTER TABLE "public"."emails" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."emails_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."interested_clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "interests" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_subscribed" boolean DEFAULT true,
    "metadata" "jsonb",
    "unsubscribe_token" "text" DEFAULT "gen_random_uuid"()
);


ALTER TABLE "public"."interested_clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" bigint NOT NULL,
    "order_id" bigint,
    "product_id" bigint,
    "variant_id" bigint,
    "quantity" integer DEFAULT 1 NOT NULL,
    "price" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_items_id_seq" OWNED BY "public"."order_items"."id";



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "total" numeric(10,2) NOT NULL,
    "status" character varying(50) DEFAULT 'pendiente'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tracking_code" character varying(100),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_submitted" boolean DEFAULT false NOT NULL,
    "submitted_at" timestamp with time zone,
    "stripe_payment_intent_id" character varying,
    "return_status" "text" DEFAULT 'none'::"text",
    "courier_id" integer,
    "shipping_address_id" bigint,
    "shipping_snapshot" "jsonb"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."orders_id_seq" OWNED BY "public"."orders"."id";



CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" bigint NOT NULL,
    "product_id" bigint,
    "url" character varying(500) NOT NULL,
    "ordering" integer DEFAULT 0
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."product_images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_images_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_images_id_seq" OWNED BY "public"."product_images"."id";



CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" bigint NOT NULL,
    "product_id" bigint,
    "name" character varying(100) NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "image" character varying(500),
    "model" character varying,
    "size" character varying,
    "stock" integer DEFAULT 0,
    "original_price" numeric
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "name" character varying(255) NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "original_price" numeric(10,2),
    "image" character varying(500) NOT NULL,
    "description" "text",
    "material" character varying(255),
    "in_stock" boolean DEFAULT true,
    "is_new" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category_id" integer NOT NULL,
    "stock" integer DEFAULT 0,
    "has_warranty" boolean DEFAULT false,
    "warranty_period" integer,
    "warranty_unit" character varying(20),
    "warranty_description" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" bigint NOT NULL,
    "order_id" bigint,
    "checkout_session_id" "text",
    "product_id" bigint,
    "variant_id" bigint,
    "quantity" integer NOT NULL,
    "reserved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "status" "public"."reservation_status" DEFAULT 'reserved'::"public"."reservation_status" NOT NULL,
    "finalized_at" timestamp with time zone
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_stock_view" AS
 WITH "reservations_summary" AS (
         SELECT COALESCE("reservations"."variant_id", "reservations"."product_id") AS "item_id",
            "sum"(
                CASE
                    WHEN ("reservations"."status" = 'reserved'::"public"."reservation_status") THEN "reservations"."quantity"
                    ELSE 0
                END) AS "reserved_qty",
            "sum"(
                CASE
                    WHEN ("reservations"."status" = 'finalized'::"public"."reservation_status") THEN "reservations"."quantity"
                    ELSE 0
                END) AS "finalized_qty",
            "sum"(
                CASE
                    WHEN ("reservations"."status" = 'expired'::"public"."reservation_status") THEN "reservations"."quantity"
                    ELSE 0
                END) AS "expired_qty"
           FROM "public"."reservations"
          GROUP BY COALESCE("reservations"."variant_id", "reservations"."product_id")
        )
 SELECT "pv"."id" AS "item_id",
    "pv"."product_id",
    "pv"."id" AS "variant_id",
    "pv"."stock" AS "stock_total",
    COALESCE("rs"."reserved_qty", (0)::bigint) AS "stock_reserved",
    COALESCE("rs"."finalized_qty", (0)::bigint) AS "stock_finalized",
    COALESCE("rs"."expired_qty", (0)::bigint) AS "stock_expired",
    ("pv"."stock" - COALESCE("rs"."reserved_qty", (0)::bigint)) AS "stock_available",
    "pv"."price",
    "p"."name" AS "product_name",
    "pv"."name" AS "variant_name"
   FROM (("public"."product_variants" "pv"
     LEFT JOIN "reservations_summary" "rs" ON (("rs"."item_id" = "pv"."id")))
     JOIN "public"."products" "p" ON (("p"."id" = "pv"."product_id")))
UNION ALL
 SELECT "p"."id" AS "item_id",
    "p"."id" AS "product_id",
    NULL::bigint AS "variant_id",
    "p"."stock" AS "stock_total",
    COALESCE("rs"."reserved_qty", (0)::bigint) AS "stock_reserved",
    COALESCE("rs"."finalized_qty", (0)::bigint) AS "stock_finalized",
    COALESCE("rs"."expired_qty", (0)::bigint) AS "stock_expired",
    ("p"."stock" - COALESCE("rs"."reserved_qty", (0)::bigint)) AS "stock_available",
    "p"."price",
    "p"."name" AS "product_name",
    NULL::character varying AS "variant_name"
   FROM ("public"."products" "p"
     LEFT JOIN "reservations_summary" "rs" ON (("rs"."item_id" = "p"."id")))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM "public"."product_variants" "pv"
          WHERE ("pv"."product_id" = "p"."id"))));


ALTER VIEW "public"."product_stock_view" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."product_variants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_variants_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_variants_id_seq" OWNED BY "public"."product_variants"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."products_id_seq" OWNED BY "public"."products"."id";



ALTER TABLE "public"."reservations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."reservations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "id" bigint NOT NULL,
    "return_id" bigint,
    "order_item_id" bigint,
    "product_id" bigint,
    "variant_id" bigint,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "refund_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."return_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."return_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."return_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."return_items_id_seq" OWNED BY "public"."return_items"."id";



CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" bigint NOT NULL,
    "order_id" bigint,
    "admin_id" "uuid",
    "reason" "text",
    "returned_at" timestamp with time zone DEFAULT "now"(),
    "refund_amount" numeric(10,2),
    "items_data" "jsonb",
    "refund_type" character varying DEFAULT 'partial'::character varying,
    "stripe_refund_id" character varying,
    "status" character varying DEFAULT 'pending'::character varying,
    "name_admin" "text",
    "processed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."returns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."returns_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."returns_id_seq" OWNED BY "public"."returns"."id";



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" bigint NOT NULL,
    "product_id" bigint,
    "user_id" "uuid" NOT NULL,
    "user_name" character varying(255) NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reviews_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reviews_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reviews_id_seq" OWNED BY "public"."reviews"."id";



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" bigint NOT NULL,
    "order_id" bigint,
    "stripe_payment_intent_id" character varying,
    "amount" numeric(10,2) NOT NULL,
    "platform_fee" numeric(10,2) NOT NULL,
    "jeweler_earnings" numeric(10,2) NOT NULL,
    "status" character varying DEFAULT 'succeeded'::character varying,
    "payout_status" character varying DEFAULT 'pending'::character varying,
    "payout_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stripe_customer_id" character varying,
    "fee_details" "jsonb",
    "net_amount" numeric GENERATED ALWAYS AS (("amount" - "platform_fee")) STORED,
    "currency" character varying DEFAULT 'mxn'::character varying,
    "shipping" numeric DEFAULT 0,
    "subtotal" numeric(10,2) DEFAULT 0,
    "taxes" numeric(10,2) DEFAULT 0
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."transactions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."transactions_id_seq" OWNED BY "public"."transactions"."id";



CREATE TABLE IF NOT EXISTS "public"."user_addresses" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" DEFAULT 'Casa'::"text",
    "name" "text",
    "phone" "text",
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "state" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'MX'::"text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_addresses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_addresses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_addresses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_addresses_id_seq" OWNED BY "public"."user_addresses"."id";



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "name" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variant_images" (
    "id" integer NOT NULL,
    "variant_id" bigint,
    "url" "text" NOT NULL,
    "ordering" integer DEFAULT 0
);


ALTER TABLE "public"."variant_images" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."variant_images_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."variant_images_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."variant_images_id_seq" OWNED BY "public"."variant_images"."id";



CREATE OR REPLACE VIEW "public"."view_orders_detailed" AS
 SELECT "o"."id" AS "order_id",
    "o"."user_id",
    "o"."total",
    "o"."status",
    "o"."tracking_code",
    "o"."created_at",
    "o"."updated_at",
    "o"."return_status",
    "o"."is_submitted",
    "o"."submitted_at",
    "o"."courier_id",
    "c"."name" AS "courier_name",
    "c"."url" AS "courier_url",
    "c"."logo" AS "courier_logo",
    "ua"."city" AS "shipping_city",
    "ua"."state" AS "shipping_state",
    "ua"."country" AS "shipping_country",
    "ua"."address_line1" AS "shipping_address_line1",
    "ua"."address_line2" AS "shipping_address_line2",
    "ua"."postal_code" AS "shipping_postal_code",
    "ua"."phone" AS "shipping_phone"
   FROM (("public"."orders" "o"
     LEFT JOIN "public"."couriers" "c" ON (("o"."courier_id" = "c"."id")))
     LEFT JOIN "public"."user_addresses" "ua" ON (("o"."shipping_address_id" = "ua"."id")));


ALTER VIEW "public"."view_orders_detailed" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_management" AS
 SELECT "ur"."user_id",
    "ur"."role",
    "p"."name" AS "profile_name",
    "p"."email" AS "profile_email",
    "p"."created_at" AS "profile_created_at"
   FROM ("public"."user_roles" "ur"
     JOIN "public"."user_profiles" "p" ON (("ur"."user_id" = "p"."user_id")));


ALTER VIEW "public"."view_user_management" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_user_roles" AS
 SELECT "ur"."user_id",
    "ur"."role",
    "u"."email",
    "u"."raw_user_meta_data" AS "user_metadata"
   FROM ("public"."user_roles" "ur"
     JOIN "auth"."users" "u" ON (("ur"."user_id" = "u"."id")));


ALTER VIEW "public"."view_user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_newsletter_subscribers" WITH ("security_invoker"='on') AS
 SELECT "email",
    "interests",
    "created_at",
    "is_subscribed"
   FROM "public"."interested_clients"
  WHERE ("is_subscribed" = true)
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."vw_newsletter_subscribers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_subscribers_management" WITH ("security_invoker"='on') AS
 SELECT "email",
    "interests",
    "created_at",
    "is_subscribed",
        CASE
            WHEN "is_subscribed" THEN 'Active'::"text"
            ELSE 'Inactive'::"text"
        END AS "status",
    "concat"('https://localhost:5173.com/unsubscribe?token=', "unsubscribe_token") AS "unsubscribe_link"
   FROM "public"."interested_clients"
  ORDER BY "created_at" DESC;


ALTER VIEW "public"."vw_subscribers_management" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."addresses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cart_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cart_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."couriers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."couriers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_images" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_images_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_variants" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_variants_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."return_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."return_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."returns" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."returns_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reviews" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."reviews_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."transactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."transactions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_addresses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_addresses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."variant_images" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."variant_images_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_reminders"
    ADD CONSTRAINT "cart_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."couriers"
    ADD CONSTRAINT "couriers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."couriers"
    ADD CONSTRAINT "couriers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interested_clients"
    ADD CONSTRAINT "interested_clients_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."interested_clients"
    ADD CONSTRAINT "interested_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interested_clients"
    ADD CONSTRAINT "interested_clients_unsubscribe_token_key" UNIQUE ("unsubscribe_token");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "unique_intent" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."variant_images"
    ADD CONSTRAINT "variant_images_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_cart_items_cart_user_id" ON "public"."cart_items" USING "btree" ("cart_user_id");



CREATE INDEX "idx_cart_items_product_id" ON "public"."cart_items" USING "btree" ("product_id");



CREATE INDEX "idx_carts_updated_at" ON "public"."carts" USING "btree" ("updated_at");



CREATE INDEX "idx_interested_clients_created_at" ON "public"."interested_clients" USING "btree" ("created_at");



CREATE INDEX "idx_interested_clients_email" ON "public"."interested_clients" USING "btree" ("email");



CREATE INDEX "idx_reviews_product_id" ON "public"."reviews" USING "btree" ("product_id");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_order_id" ON "public"."transactions" USING "btree" ("order_id");



CREATE INDEX "idx_transactions_stripe_customer_id" ON "public"."transactions" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_variant_images_variant_id" ON "public"."variant_images" USING "btree" ("variant_id");



CREATE UNIQUE INDEX "only_one_default_address_per_user" ON "public"."user_addresses" USING "btree" ("user_id") WHERE ("is_default" = true);



CREATE INDEX "order_items_order_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "reservations_checkout_status_idx" ON "public"."reservations" USING "btree" ("checkout_session_id", "status");



CREATE INDEX "reservations_expires_idx" ON "public"."reservations" USING "btree" ("expires_at");



CREATE INDEX "reservations_order_status_idx" ON "public"."reservations" USING "btree" ("order_id", "status");



CREATE INDEX "transactions_order_idx" ON "public"."transactions" USING "btree" ("order_id");



CREATE OR REPLACE TRIGGER "carts_update_timestamp" BEFORE UPDATE ON "public"."carts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "orders_set_submitted_timestamp" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_submitted_timestamp"();



CREATE OR REPLACE TRIGGER "trg_restore_inventory_after_cancel" AFTER DELETE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."restore_inventory_after_cancel"();



CREATE OR REPLACE TRIGGER "trg_validate_order_status" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_status"();



CREATE OR REPLACE TRIGGER "trg_validate_order_total_refund" BEFORE INSERT OR UPDATE OF "refund_amount", "status" ON "public"."returns" FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_total_refund"();



CREATE OR REPLACE TRIGGER "trg_validate_return_item" BEFORE INSERT ON "public"."return_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_return_item"();



CREATE OR REPLACE TRIGGER "trigger_enforce_max_4_addresses" BEFORE INSERT ON "public"."user_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_max_4_addresses"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_user_id_fkey" FOREIGN KEY ("cart_user_id") REFERENCES "public"."carts"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."cart_reminders"
    ADD CONSTRAINT "cart_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "fk_return_items_return" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."user_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."user_addresses"
    ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_images"
    ADD CONSTRAINT "variant_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



CREATE POLICY "Admins and workers can view all transactions" ON "public"."transactions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'worker'::character varying])::"text"[]))))));



CREATE POLICY "Admins can delete couriers" ON "public"."couriers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can insert couriers" ON "public"."couriers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all profiles" ON "public"."user_profiles" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage all return items" ON "public"."return_items" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can manage roles" ON "public"."user_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND (("ur"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND (("ur"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can update couriers" ON "public"."couriers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can view couriers" ON "public"."couriers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can view orders" ON "public"."orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Allow Supabase service role full access" ON "public"."reservations" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Allow Worker updates on orders" ON "public"."orders" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'worker'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'worker'::"text")))));



CREATE POLICY "Allow public read addresses" ON "public"."addresses" FOR SELECT USING (true);



CREATE POLICY "Allow public read cart_items" ON "public"."cart_items" FOR SELECT USING (true);



CREATE POLICY "Allow public read cart_reminders" ON "public"."cart_reminders" FOR SELECT USING (true);



CREATE POLICY "Allow public read carts" ON "public"."carts" FOR SELECT USING (true);



CREATE POLICY "Allow public read emails" ON "public"."emails" FOR SELECT USING (true);



CREATE POLICY "Allow public read interested_clients" ON "public"."interested_clients" FOR SELECT USING (true);



CREATE POLICY "Allow public read order_items" ON "public"."order_items" FOR SELECT USING (true);



CREATE POLICY "Allow public read orders" ON "public"."orders" FOR SELECT USING (true);



CREATE POLICY "Allow public read returns" ON "public"."returns" FOR SELECT USING (true);



CREATE POLICY "Allow public read variant_images" ON "public"."variant_images" FOR SELECT USING (true);



CREATE POLICY "Anyone can view roles" ON "public"."user_roles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Cualquiera puede suscribirse" ON "public"."interested_clients" FOR INSERT WITH CHECK (true);



CREATE POLICY "No access by default" ON "public"."reservations" AS RESTRICTIVE USING (false) WITH CHECK (false);



CREATE POLICY "Users can view their own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own return items" ON "public"."return_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."returns" "r"
     JOIN "public"."orders" "o" ON (("o"."id" = "r"."order_id")))
  WHERE (("r"."id" = "return_items"."return_id") AND ("o"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users manage own addresses" ON "public"."addresses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own cart_items" ON "public"."cart_items" USING (("auth"."uid"() = "cart_user_id"));



CREATE POLICY "Users manage own cart_reminders" ON "public"."cart_reminders" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own carts" ON "public"."carts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own reviews" ON "public"."reviews" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Workers can select couriers" ON "public"."couriers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'worker'::"text")))));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow admin deletes on orders" ON "public"."orders" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin deletes on product_images" ON "public"."product_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin deletes on product_variants" ON "public"."product_variants" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin deletes on products" ON "public"."products" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin deletes on returns" ON "public"."returns" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin deletes on variant_images" ON "public"."variant_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin inserts on orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin inserts on product_images" ON "public"."product_images" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin inserts on product_variants" ON "public"."product_variants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin inserts on products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin inserts on returns" ON "public"."returns" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin inserts on variant_images" ON "public"."variant_images" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin updates on orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin updates on product_images" ON "public"."product_images" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin updates on product_variants" ON "public"."product_variants" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin updates on products" ON "public"."products" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin updates on returns" ON "public"."returns" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "allow admin updates on variant_images" ON "public"."variant_images" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND (("user_roles"."role")::"text" = 'admin'::"text")))));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cart_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_public_read" ON "public"."categories" FOR SELECT USING (true);



ALTER TABLE "public"."couriers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."interested_clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_images_public_read" ON "public"."product_images" FOR SELECT USING (true);



ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_variants_public_read" ON "public"."product_variants" FOR SELECT USING (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_public_read" ON "public"."products" FOR SELECT USING (true);



ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."return_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."returns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."variant_images" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";







































































































































































































































GRANT ALL ON FUNCTION "public"."can_user_review"("input_product_id" bigint, "input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_review"("input_product_id" bigint, "input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_review"("input_product_id" bigint, "input_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_role"("user_id" "uuid", "allowed_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_role"("user_id" "uuid", "allowed_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_role"("user_id" "uuid", "allowed_roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_orphan_checkout_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_orphan_checkout_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_orphan_checkout_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_reservations_for_order"("p_items" "jsonb", "p_order_id" bigint, "p_checkout_session_id" "text", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_reservations_for_order"("p_items" "jsonb", "p_order_id" bigint, "p_checkout_session_id" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_reservations_for_order"("p_items" "jsonb", "p_order_id" bigint, "p_checkout_session_id" "text", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_product_stock"("product_id" bigint, "amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_product_stock"("product_id" bigint, "amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_product_stock"("product_id" bigint, "amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_variant_stock"("variant_id" bigint, "amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_variant_stock"("variant_id" bigint, "amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_variant_stock"("variant_id" bigint, "amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_max_4_addresses"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_max_4_addresses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_max_4_addresses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_reservations_for_order"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_reservations_for_order"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_reservations_for_order"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_courier_performance"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_courier_performance"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_courier_performance"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_order_items_detailed"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_order_items_detailed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_order_items_detailed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_orders_detailed"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_orders_detailed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_orders_detailed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_returns_detailed"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_returns_detailed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_returns_detailed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sales_summary_financial"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sales_summary_financial"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sales_summary_financial"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_sales_summary_simple"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_sales_summary_simple"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_sales_summary_simple"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_shipping_summary"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_shipping_summary"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_shipping_summary"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_return"("order_id_param" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."process_return"("order_id_param" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_return"("order_id_param" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_return_items" "jsonb", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_stripe_refund_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_return_items" "jsonb", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_stripe_refund_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_return_items" "jsonb", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_stripe_refund_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_stripe_refund_id" "text", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_return_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_stripe_refund_id" "text", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_return_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_return_atomically"("p_return_id" bigint, "p_stripe_refund_id" "text", "p_refund_amount" numeric, "p_refund_type" "text", "p_refund_only" boolean, "p_return_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_expired_reservations"() TO "anon";
GRANT ALL ON FUNCTION "public"."release_expired_reservations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_expired_reservations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."release_reservations_for_order"("p_order_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."release_reservations_for_order"("p_order_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_reservations_for_order"("p_order_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_inventory_after_cancel"() TO "anon";
GRANT ALL ON FUNCTION "public"."restore_inventory_after_cancel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_inventory_after_cancel"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_abandoned_carts"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_abandoned_carts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_abandoned_carts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_submitted_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_submitted_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_submitted_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_order_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_order_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_order_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_order_total_refund"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_order_total_refund"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_order_total_refund"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_return_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_return_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_return_item"() TO "service_role";
























GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."addresses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."addresses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."addresses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cart_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cart_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cart_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cart_reminders" TO "anon";
GRANT ALL ON TABLE "public"."cart_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_reminders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cart_reminders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cart_reminders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cart_reminders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."couriers" TO "anon";
GRANT ALL ON TABLE "public"."couriers" TO "authenticated";
GRANT ALL ON TABLE "public"."couriers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."couriers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."couriers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."couriers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON SEQUENCE "public"."emails_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."emails_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."emails_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."interested_clients" TO "anon";
GRANT ALL ON TABLE "public"."interested_clients" TO "authenticated";
GRANT ALL ON TABLE "public"."interested_clients" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_images_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_images_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_images_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON TABLE "public"."product_stock_view" TO "anon";
GRANT ALL ON TABLE "public"."product_stock_view" TO "authenticated";
GRANT ALL ON TABLE "public"."product_stock_view" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reservations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."return_items" TO "anon";
GRANT ALL ON TABLE "public"."return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."returns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."returns_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."returns_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_addresses" TO "anon";
GRANT ALL ON TABLE "public"."user_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."user_addresses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_addresses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_addresses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_addresses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."variant_images" TO "anon";
GRANT ALL ON TABLE "public"."variant_images" TO "authenticated";
GRANT ALL ON TABLE "public"."variant_images" TO "service_role";



GRANT ALL ON SEQUENCE "public"."variant_images_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."variant_images_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."variant_images_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."view_orders_detailed" TO "anon";
GRANT ALL ON TABLE "public"."view_orders_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."view_orders_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_management" TO "anon";
GRANT ALL ON TABLE "public"."view_user_management" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_management" TO "service_role";



GRANT ALL ON TABLE "public"."view_user_roles" TO "anon";
GRANT ALL ON TABLE "public"."view_user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."view_user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."vw_newsletter_subscribers" TO "anon";
GRANT ALL ON TABLE "public"."vw_newsletter_subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_newsletter_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."vw_subscribers_management" TO "anon";
GRANT ALL ON TABLE "public"."vw_subscribers_management" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_subscribers_management" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
