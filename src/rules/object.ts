import Rule from '../types/rule';
import { async, clone, assign } from '../util';


class ObjectValidator extends Rule {
    public operates() {
        return false;
    }

    public static ruleName() {
        return 'object';
    }
}

class Keys extends Rule {
    public compile(params) {
        const found = params.invokeFirst(this.constructor, rule => {
            rule._obj = assign({}, rule._obj, params.args[0]);
            rule._keys = rule._keys.concat(Object.keys(params.args[0]));
        });
        if (found) {
            return;
        }
        this._obj = params.args[0];
        this._keys = Object.keys(params.args[0]);
        // If an Unknown rule is added later, it'll set this to true
        this._allowUnknown = false;
    }

    public operates() {
        return !!this._keys;
    }

    /**
     * Checks to see if the value contains unknown keys. Returns true and
     * calls back with an error if so.
     * @param  {Object}   params
     * @param  {Function} callback
     * @return {Boolean}
     */
    public _validateUnknown(params, callback) {
        const keys = Object.keys(params.value);
        for (let i = 0; i < keys.length; i++) {
            if (this._keys.indexOf(keys[i]) === -1) {
                callback(this.error(params, { extra: keys[i], rule: 'object.unknown' }));
                return true;
            }
        }

        return false;
    }

    public validate(params, callback) {
        const value = params.value;
        if (value === undefined || value === null) {
            return callback(this.error(params));
        }

        if (!this._allowUnknown && this._validateUnknown(params, callback)) {
            return undefined;
        }

        const todo = this._keys.map((key) => {
            const options = clone(params.options);
            options._path = options._path.concat(key);

            return (done) => {
                params.validator.validate(
                    value[key],
                    this._obj[key],
                    options,
                    (err, converted) => {
                        if (err) {
                            return done(err);
                        }

                        if (options.convert && converted !== undefined) {
                            value[key] = converted;
                        }

                        return done();
                    }
                );
            };
        });

        return async.all(todo, callback);
    }

    public static ruleName() {
        return 'object.keys';
    }
}

class Unknown extends Rule {
    public compile(params): void {
        const allow = params.args[0] === undefined ? true : params.args[0];
        params.invokeLast(Keys, r => { r._allowUnknown = allow; });
    }

    public operates(): boolean {
        return false;
    }

    public static ruleName() {
        return 'object.unknown';
    }
}

module.exports = [ObjectValidator, Keys, Unknown];