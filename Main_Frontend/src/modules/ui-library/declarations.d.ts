/// <reference types="react" />
declare module "*.css";

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}
