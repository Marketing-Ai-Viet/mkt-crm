/**
 * Casbin Enforcer Constants
 *
 * Unified RBAC+ABAC model for workspace-isolated policies
 */

/**
 * Unified RBAC+ABAC model for workspace-isolated policies
 *
 * This model supports both:
 * - Pure RBAC: Policies without conditions (condition = "")
 * - ABAC: Policies with attribute-based conditions
 *
 * Format: request(sub, obj, act, attr)
 * - sub: Subject (user:uuid, role:name)
 * - obj: Object/Resource (mktOrder, mktCustomer)
 * - act: Action (read, write, delete, *)
 * - attr: Attributes for condition evaluation (can be empty {})
 *
 * Policy format: p, subject, object, action, effect, condition
 * - condition: JavaScript expression or empty string for pure RBAC
 *
 * Example policies:
 * - RBAC: p, role:admin, mktOrder, *, allow, ""
 * - ABAC: p, role:viewer, mktOrder, read, allow, "r.attr.clearance >= 2"
 * - Time-based: p, role:temp, mktOrder, read, allow, "r.attr.currentTime <= '2026-03-31'"
 *
 * Role assignment: g, user, role
 * Resource grouping: g2, resource, group
 */
export const CASBIN_MODEL = `
[request_definition]
r = sub, obj, act, attr

[policy_definition]
p = sub, obj, act, eft, condition

[role_definition]
g = _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && (g2(r.obj, p.obj) || r.obj == p.obj) && (r.act == p.act || p.act == "*") && (p.condition == "" || eval(p.condition))
`;
