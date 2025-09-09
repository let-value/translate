import { Fragment } from "react";
import { Message, Plural } from "@let-value/translate-react";

const name = "World";
const n = 2;

<Message>hello</Message>;
<Message>hello {name}</Message>;
<Message context="verb">run</Message>;
<Message context="ctx" children="hello" />;
<Plural number={1} forms={[<Fragment>one</Fragment>, <Fragment>many</Fragment>]} />;
<Plural
    number={n}
    forms={[<Fragment>One {name}</Fragment>, <Fragment>Many {name}s</Fragment>]}
    context="count"
/>;
<Plural number={n} forms={["simple one", "simple many"]} />;
