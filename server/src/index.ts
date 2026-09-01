import { readFileSync } from "node:fs";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { resolvers } from "./resolvers";

const typeDefs = readFileSync(new URL("./schema.graphql", import.meta.url), "utf8");

const server = new ApolloServer({ typeDefs, resolvers });
const port = Number(process.env.PORT ?? 4000);
const { url } = await startStandaloneServer(server, { listen: { port } });

console.log(`GraphQL ready at ${url}`);
