import { createClient } from "@supabase/supabase-js";

const SOURCE = createClient(
  process.env.SOURCE_SUPABASE_URL!,
  process.env.SOURCE_SERVICE_ROLE_KEY!
);

const TARGET = createClient(
  process.env.TARGET_SUPABASE_URL!,
  process.env.TARGET_SERVICE_ROLE_KEY!
);

async function migrate() {
  console.log("🚀 Iniciando migración...\n");

  // 1. Migrar productos
  console.log("📦 Migrando productos...");
  const { data: productos, error: prodError } = await SOURCE
    .from("productos")
    .select("*");

  if (prodError) {
    console.error("❌ Error al leer productos:", prodError.message);
  } else if (productos?.length) {
    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < productos.length; i += batchSize) {
      const batch = productos.slice(i, i + batchSize);
      const { error } = await TARGET.from("productos").insert(batch);
      if (error) {
        console.error(`❌ Error insertando productos batch ${i}:`, error.message);
      } else {
        console.log(
          `✅ ${Math.min(i + batchSize, productos.length)}/${
            productos.length
          } productos migrados`
        );
      }
    }
  } else {
    console.log("ℹ️ No hay productos para migrar");
  }

  // 2. Migrar clientes
  console.log("\n👥 Migrando clientes...");
  const { data: clientes, error: cliError } = await SOURCE
    .from("clientes")
    .select("*");

  if (cliError) {
    console.error("❌ Error al leer clientes:", cliError.message);
  } else if (clientes?.length) {
    const batchSize = 50;
    for (let i = 0; i < clientes.length; i += batchSize) {
      const batch = clientes.slice(i, i + batchSize);
      const { error } = await TARGET.from("clientes").insert(batch);
      if (error) {
        console.error(`❌ Error insertando clientes batch ${i}:`, error.message);
      } else {
        console.log(
          `✅ ${Math.min(i + batchSize, clientes.length)}/${
            clientes.length
          } clientes migrados`
        );
      }
    }
  } else {
    console.log("ℹ️ No hay clientes para migrar");
  }

  // 3. Migrar pedidos
  console.log("\n📋 Migrando pedidos...");
  const { data: pedidos, error: pedError } = await SOURCE
    .from("pedidos")
    .select("*");

  if (pedError) {
    console.error("❌ Error al leer pedidos:", pedError.message);
  } else if (pedidos?.length) {
    const batchSize = 50;
    for (let i = 0; i < pedidos.length; i += batchSize) {
      const batch = pedidos.slice(i, i + batchSize);
      const { error } = await TARGET.from("pedidos").insert(batch);
      if (error) {
        console.error(`❌ Error insertando pedidos batch ${i}:`, error.message);
      } else {
        console.log(
          `✅ ${Math.min(i + batchSize, pedidos.length)}/${
            pedidos.length
          } pedidos migrados`
        );
      }
    }
  } else {
    console.log("ℹ️ No hay pedidos para migrar");
  }

  console.log("\n🎉 Migración completa");
}

migrate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
