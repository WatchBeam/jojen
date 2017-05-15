import { Schema } from './Schema';
import { IRuleCtor, Rule } from './types/Rule';
import { Validator } from './validator';

/**
 * The Ruleset is an object used for collecting and building sets of validation
 * rules. It contains a tree structure of rules, which can be bound to a
 * provided object. On the bound object, you can call rules which are
 * parents, siblings of parents, or direct children of the
 * current node in the rule tree.
 *
 * For example, if we had a tree built with the following named rules...
 *  - number
 *  - number.min
 *  - number.integer
 *  - number.integer.thirtyTwoBit
 *  - date.min
 *  - date.iso
 *  - required
 *
 * then with a ruleset starting at the root of the tree:
 *
 *  rule.number().min(); // valid, chains on `number` and `number.min`
 *  rule.number().iso(); // invalid, `iso` isn't in `number`'s tree
 *  rule.number().required(); // valid, required() is a parent of number
 *  rule.thirtyTwoBit(); // invalid, `thirtyTwoBit` is not a direct child
 *                          of the root.
 *
 * If there are conflicting names, the deeper children will always override
 * the shallower (less specific) children.
 */
export class Ruleset {
    private node: IRuleCtor<Rule>;
    private children: { [prop: string]: Ruleset } = {};
    constructor(private parent: Ruleset = null) {
    }

    /**
     * Returns the node of this ruleset: a Rule, or null.
     */
    public getNode (): IRuleCtor<Rule> {
        return this.node;
    }

    /**
     * Adds a new rule to the ruleset.
     */
    public addRule(path: string[], rule: IRuleCtor<Rule>) {
        if (path.length === 0) {
            this.node = rule;
            return;
        }

        const head = path[0];
        if (!this.children[head]) {
            this.children[head] = new Ruleset(this);
        }

        this.children[head].addRule(path.slice(1), rule);
    }

    /**
     * Attaches rule methods to the provided object.
     */
    public buildChain (obj: Validator | Schema, fn: (key: string, child: Ruleset, ...args: any[]) => Schema) {
        if (this.parent) {
            this.parent.buildChain(obj, fn);
        }

        Object.keys(this.children).forEach(key => {
            const child = this.children[key];
            const handler = function (...args: any[]) {
                return fn.call(this, key, child, args);
            };

            // TODO: Improve this.
            (<any>obj)[key] = handler;
        });
    }
}
