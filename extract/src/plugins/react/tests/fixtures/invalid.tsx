import { Message, Plural } from "@let-value/translate-react";
import { Fragment } from "react";

const name = "World";
const n = 2;

<Message>{name.toUpperCase()}</Message>;
<Plural number={n} forms={[<Fragment>{name.toUpperCase()}</Fragment>, <Fragment>many</Fragment>]} />;
