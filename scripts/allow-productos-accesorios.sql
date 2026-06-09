-- Run this in Supabase SQL Editor before creating products with genero = 'accesorios'.
-- The live database currently rejects accesorios through productos_genero_check.

ALTER TABLE public.productos
DROP CONSTRAINT IF EXISTS productos_genero_check;

ALTER TABLE public.productos
ADD CONSTRAINT productos_genero_check
CHECK (genero IN ('hombres', 'mujeres', 'accesorios'));
