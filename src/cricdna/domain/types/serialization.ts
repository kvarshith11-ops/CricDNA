export type JsonPrimitive = string | number | boolean | null

export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[]

export interface Serializable<TJson> {
  toJSON: () => TJson
}
