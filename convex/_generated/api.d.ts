/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analysis from "../analysis.js";
import type * as auth from "../auth.js";
import type * as dailySummary from "../dailySummary.js";
import type * as http from "../http.js";
import type * as movements from "../movements.js";
import type * as products from "../products.js";
import type * as stockCounts from "../stockCounts.js";
import type * as stockSessions from "../stockSessions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analysis: typeof analysis;
  auth: typeof auth;
  dailySummary: typeof dailySummary;
  http: typeof http;
  movements: typeof movements;
  products: typeof products;
  stockCounts: typeof stockCounts;
  stockSessions: typeof stockSessions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
