-- Script de migración para Plan A: Ofertas bajo pedido
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar la columna bajo_pedido
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS bajo_pedido BOOLEAN DEFAULT false;

-- 2. Marcar las ofertas y packs existentes como productos bajo pedido
UPDATE public.productos
SET bajo_pedido = true
WHERE genero = 'accesorios'
  AND (
    LOWER(nombre) LIKE '%pack%'
    OR LOWER(nombre) LIKE '%combo%'
    OR LOWER(nombre) LIKE '%kit%'
    OR LOWER(nombre) LIKE '%oferta%'
    OR LOWER(COALESCE(categoria, '')) LIKE '%pack%'
    OR LOWER(COALESCE(categoria, '')) LIKE '%oferta%'
  );
