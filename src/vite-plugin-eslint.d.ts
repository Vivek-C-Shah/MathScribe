declare module "vite-plugin-eslint" {
	import type { Plugin } from "vite";
	const eslint: () => Plugin;
	export default eslint;
}