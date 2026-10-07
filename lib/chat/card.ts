/** A task made from a message, shown in the chat as a card that links to it. */
export type TaskCard = { kind: "task"; taskId: string; title: string; assignee: string; href: string }
