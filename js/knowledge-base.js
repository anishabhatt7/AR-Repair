let database = null;

export async function loadKnowledgeBase() {
  if (database) return database;

  try {
    const response = await fetch('/data/repairs.json');
    database = await response.json();
  } catch (e) {
    database = { categories: {}, products: [] };
  }

  return database;
}

export function findProduct(category, modelQuery) {
  if (!database || !modelQuery) return null;

  const query = modelQuery.toLowerCase().trim();
  const products = database.products.filter(p =>
    !category || p.category === category
  );

  for (const product of products) {
    if (product.model.toLowerCase() === query) return product;

    for (const alias of (product.aliases || [])) {
      if (alias.toLowerCase() === query) return product;
    }
  }

  for (const product of products) {
    if (product.model.toLowerCase().includes(query) || query.includes(product.model.toLowerCase())) {
      return product;
    }

    for (const alias of (product.aliases || [])) {
      if (alias.toLowerCase().includes(query) || query.includes(alias.toLowerCase())) {
        return product;
      }
    }
  }

  const queryWords = query.split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const product of products) {
    const matchFields = [product.model, product.brand, ...(product.aliases || [])].join(' ').toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (matchFields.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}

export function getRepairContext(product, problemDescription) {
  if (!product || !product.common_problems) return null;

  const problem = problemDescription.toLowerCase();
  const matches = product.common_problems.filter(cp => {
    const symptoms = cp.symptoms.join(' ').toLowerCase();
    const name = cp.problem.toLowerCase();
    return problem.includes(name) || cp.symptoms.some(s => problem.includes(s.toLowerCase()));
  });

  if (matches.length === 0) return null;

  return {
    product_name: `${product.brand} ${product.model}`,
    matched_problems: matches.map(m => ({
      problem: m.problem,
      difficulty: m.difficulty,
      tools_needed: m.tools_needed,
      estimated_time: m.estimated_time,
      steps: m.steps
    }))
  };
}

export function getCategories() {
  if (!database) return {};
  return database.categories || {};
}
