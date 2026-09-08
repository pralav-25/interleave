# Research behind Interleave

Research date: 8 September 2026. This is a purposeful sample of 13 established projects and relevant prior art, not an exhaustive survey or a ranking of all GitHub developers. Counts were retrieved from the GitHub REST API and will change. The machine-readable snapshot is in [research-snapshot.json](research-snapshot.json).

## Observed patterns

- [Sindre Sorhus's Awesome](https://github.com/sindresorhus/awesome) makes knowledge discoverable through a contribution format.
- [Anthony Fu's ni](https://github.com/antfu-collective/ni) and [Anton Medvedev's fx](https://github.com/antonmedv/fx) communicate a narrow developer job in one sentence.
- [Build Your Own X](https://github.com/codecrafters-io/build-your-own-x), [50 Projects in 50 Days](https://github.com/bradtraversy/50projects50days), [JavaScript Algorithms](https://github.com/trekhleb/javascript-algorithms), [The Algorithms/Python](https://github.com/TheAlgorithms/Python), and [Developer Roadmap](https://github.com/nilbuild/developer-roadmap) make learning into a browsable, contributable resource.
- [Karpathy's micrograd](https://github.com/karpathy/micrograd) provides a compact implementation of an intimidating concept.
- [Excalidraw](https://github.com/excalidraw/excalidraw) and [Monaco Editor](https://github.com/microsoft/monaco-editor) make a complex capability tangible through an interactive interface.
- [Nicky Case's The Evolution of Trust](https://github.com/ncase/trust) offers a reference for learning by changing inputs and observing consequences.
- [The Deadlock Empire](https://github.com/deadlockempire/deadlockempire.github.io) is directly relevant prior art: a browser game where learners control scheduling and expose concurrency failures.

These observations suggest design principles; they do not establish what caused the projects' stars. Distribution, age, maintenance, community, timing, and creator audiences are confounders. Successful projects are overrepresented by construction.

## Concept decision

| Candidate                       | Appeal                                                 | Main drawback for a new small project                        |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Another developer resource list | Broad audience, easy contributions                     | Weak distinction and ongoing curation burden                 |
| Repository-to-AI-context tool   | Clear current developer need                           | Established tools and parser/integration complexity          |
| Interactive concurrency lab     | Immediate visual demonstration, durable learning value | Needs careful correctness and clear limits; prior art exists |

We selected the concurrency lab because the first useful experience takes a few clicks, runs without accounts or paid APIs, and gives contributors a precise extension unit: one bug, one invariant, one fix.

Interleave combines modern application scenarios with exhaustive terminal-schedule inspection, rewind-and-branch execution, versioned replay links, and Markdown trace exports. This is a product positioning hypothesis, not a claim of scientific novelty or guaranteed popularity. The name is also used by unrelated projects; we do not claim exclusive ownership of the word.

## Applied choices

1. Show the actual working lab immediately.
2. Make the first failure reproducible in six clicks.
3. Put source and creator links where users finish a useful action.
4. Keep the engine separate, readable, deterministic, and tested.
5. Provide a contribution guide and an experiment proposal template.
6. Cite technical sources and disclose the model boundary.

No code or assets were copied from the research references. Libraries used by the implementation retain their own licenses.
