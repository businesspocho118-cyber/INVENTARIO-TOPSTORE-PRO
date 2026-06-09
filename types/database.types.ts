export interface Producto {
  id: number;
  product_id: string;
  nombre: string;
  descripcion: string | null;
  precio: string;
  colores: string | null;
  genero: "hombres" | "mujeres" | "accesorios" | "unisex";
  categoria: string | null;
  image_paths: string[] | Record<string, string[]>;
  stock: number;
  activo: boolean;
  tallas: string | null;
  unidades: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  referencias: string | null;
  ultimo_metodo_pago: string | null;
  compras: number;
  nivel_fidelidad: "New" | "Active" | "Silver" | "Gold";
  created_at: string;
}

export interface PedidoItem {
  product_id?: string;
  variant_key?: string;
  nombre: string;
  producto_nombre?: string;
  color?: string;
  talla?: string;
  cantidad: number;
  precio: string;
  precio_unitario?: number;
  image_path?: string;
}

export interface Pedido {
  id: number;
  fecha: string;
  cliente_id: number | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  cliente_barrio: string | null;
  cliente_referencias: string | null;
  metodo_pago: string | null;
  estado: "pendiente" | "entregado" | "cancelado" | "en camino";
  total: number;
  notas: string | null;
  items: PedidoItem[];
}

export type ProductoInsert = Omit<Producto, "id" | "created_at" | "updated_at">;
export type ProductoUpdate = Partial<ProductoInsert> & Pick<Producto, "product_id">;

export interface DashboardMetrics {
  total_productos_activos: number;
  productos_agotados: number;
  total_pedidos: number;
  pedidos_pendientes: number;
  total_clientes: number;
  ventas_totales: number;
}
