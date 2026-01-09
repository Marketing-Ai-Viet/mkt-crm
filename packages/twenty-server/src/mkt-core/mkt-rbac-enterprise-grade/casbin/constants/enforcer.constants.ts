/**
 * Casbin Enforcer Constants
 *
 * RBAC model for workspace-isolated policies
 */

/**
 * RBAC model for workspace-isolated policies (no domain needed)
 * Format: request(sub, obj, act)
 *
 * Each workspace has its own schema with policies, so domain filtering
 * is not needed at the Casbin level.
 *
 * Policy format: p, subject, object, action, effect
 * Role assignment: g, user, role
 * Resource grouping: g2, resource, group
 */
export const RBAC_MODEL = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && (g2(r.obj, p.obj) || r.obj == p.obj) && (r.act == p.act || p.act == "*")
`;
