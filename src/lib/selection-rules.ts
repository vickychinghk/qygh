export type CommentSelectionState = {
  id: string;
  submissionId: string;
  selected: boolean;
};

export function selectFinalCommentState<T extends CommentSelectionState>(
  comments: T[],
  submissionId: string,
  commentId: string,
) {
  return comments.map((comment) => {
    if (comment.submissionId !== submissionId) {
      return comment;
    }

    return {
      ...comment,
      selected: comment.id === commentId,
    };
  });
}
