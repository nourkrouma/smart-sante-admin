import { ProductList } from "@/components/products/product-list";
import { getProducts } from "@/lib/products";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="w-full px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Produits
        </h1>
        <p className="mt-1 text-sm text-muted">
          {products.length} produit{products.length === 1 ? "" : "s"}
        </p>
      </header>

      <ProductList products={products} />
    </div>
  );
}
