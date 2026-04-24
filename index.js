const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Personal credentials ──────────────────────────────────────────────────────
const USER_ID = "Niranjan Das A_17/07/2005"; // ← replace with fullname_ddmmyyyy
const EMAIL_ID = "nd8905@srmist.edu.in"; // ← replace with your college email
const COLLEGE_ROLL = "RA2311026010447"; // ← replace with your roll number
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a single entry.
 * Returns { valid: true, parent, child } or { valid: false }
 */
function parseEntry(raw) {
  const s = raw.trim();
  // Must match exactly X->Y where X and Y are single uppercase letters
  const match = s.match(/^([A-Z])->([A-Z])$/);
  if (!match) return { valid: false };
  const [, parent, child] = match;
  if (parent === child) return { valid: false }; // self-loop
  return { valid: true, parent, child };
}

/**
 * Build nested tree object from adjacency map starting at `node`.
 */
function buildTree(node, children) {
  const obj = {};
  if (children[node]) {
    for (const child of children[node]) {
      obj[child] = buildTree(child, children);
    }
  }
  return obj;
}

/**
 * Detect cycle in a group using DFS.
 */
function hasCycle(nodes, children) {
  const visited = new Set();
  const stack = new Set();

  function dfs(node) {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const child of (children[node] || [])) {
      if (dfs(child)) return true;
    }
    stack.delete(node);
    return false;
  }

  for (const n of nodes) {
    if (!visited.has(n) && dfs(n)) return true;
  }
  return false;
}

/**
 * Compute the depth (longest root-to-leaf path node count).
 */
function computeDepth(node, children, memo = {}) {
  if (memo[node] !== undefined) return memo[node];
  const kids = children[node] || [];
  if (kids.length === 0) return (memo[node] = 1);
  const max = Math.max(...kids.map((c) => computeDepth(c, children, memo)));
  return (memo[node] = 1 + max);
}

app.post("/bfhl", (req, res) => {
  const data = (req.body && Array.isArray(req.body.data)) ? req.body.data : [];

  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const childParent = {}; // child → first parent (for diamond rule)
  const children = {};    // parent → [children]
  const allNodes = new Set();

  for (const raw of data) {
    const entry = parseEntry(String(raw));
    if (!entry.valid) {
      invalid_entries.push(String(raw).trim() || raw);
      continue;
    }

    const edgeKey = `${entry.parent}->${entry.child}`;

    // Duplicate check
    if (seenEdges.has(edgeKey)) {
      if (!duplicate_edges.includes(edgeKey)) {
        duplicate_edges.push(edgeKey);
      }
      continue;
    }
    seenEdges.add(edgeKey);

    // Diamond: if child already has a parent, silently discard
    if (childParent[entry.child] !== undefined) continue;

    childParent[entry.child] = entry.parent;
    if (!children[entry.parent]) children[entry.parent] = [];
    children[entry.parent].push(entry.child);
    allNodes.add(entry.parent);
    allNodes.add(entry.child);
  }

  // Find all root nodes (nodes that are never a child)
  const nonRoots = new Set(Object.keys(childParent));
  const roots = [...allNodes].filter((n) => !nonRoots.has(n)).sort();

  // Group nodes by connectivity (union-find)
  const parent = {};
  function find(x) {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a, b) {
    parent[find(a)] = find(b);
  }

  for (const [p, cs] of Object.entries(children)) {
    for (const c of cs) union(p, c);
  }

  // Collect groups
  const groups = {};
  for (const n of allNodes) {
    const r = find(n);
    if (!groups[r]) groups[r] = new Set();
    groups[r].add(n);
  }

  const hierarchies = [];

  for (const groupNodes of Object.values(groups)) {
    const groupSet = groupNodes;

    // Find root(s) within this group
    const groupRoots = roots.filter((r) => groupSet.has(r));

    // Build sub-children restricted to this group
    const subChildren = {};
    for (const n of groupSet) {
      if (children[n]) {
        subChildren[n] = children[n].filter((c) => groupSet.has(c));
      }
    }

    const cycle = hasCycle([...groupSet], subChildren);

    if (groupRoots.length === 0 && cycle) {
      // Pure cycle — use lex smallest node as root
      const pureRoot = [...groupSet].sort()[0];
      hierarchies.push({ root: pureRoot, tree: {}, has_cycle: true });
    } else if (cycle) {
      const cycleRoot = groupRoots[0];
      hierarchies.push({ root: cycleRoot, tree: {}, has_cycle: true });
    } else {
      // Non-cyclic — may have multiple roots in the group (shouldn't happen
      // often but handle it)
      for (const gr of (groupRoots.length ? groupRoots : [[...groupSet].sort()[0]])) {
        const tree = {};
        tree[gr] = buildTree(gr, subChildren);
        const depth = computeDepth(gr, subChildren);
        hierarchies.push({ root: gr, tree, depth });
      }
    }
  }

  // Sort hierarchies for deterministic output (non-cyclic before cyclic, then lex root)
  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root.localeCompare(b.root);
  });

  // Summary
  const nonCyclic = hierarchies.filter((h) => !h.has_cycle);
  const total_trees = nonCyclic.length;
  const total_cycles = hierarchies.filter((h) => h.has_cycle).length;

  let largest_tree_root = "";
  let maxDepth = -1;
  for (const h of nonCyclic) {
    if (
      h.depth > maxDepth ||
      (h.depth === maxDepth && h.root < largest_tree_root)
    ) {
      maxDepth = h.depth;
      largest_tree_root = h.root;
    }
  }

  res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: { total_trees, total_cycles, largest_tree_root },
  });
});

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
