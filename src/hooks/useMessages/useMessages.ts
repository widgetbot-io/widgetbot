import produce from 'immer'
import { MESSAGES, DELETED_MESSAGES, NEW_MESSAGES, UPDATED_MESSAGES } from '.'
import { useQuery, useSubscription } from 'react-apollo-hooks'

/**
 * Fetches the messages for a channel
 * The returned messages may not be in the correct order
 */
export const useMessages = (channel: string) => {
  const query = useQuery(MESSAGES, {
    variables: { channel },
    fetchPolicy: 'cache-first'
  });

  const ready =
    (query.data && query.data.channel && query.data.channel.id === channel) ||
    false;

  const messages = ready ? query.data.channel.messages : [];

  async function fetchMore(options?: {
    around?: string
    after?: string
    before?: string
    limit?: number
  }) {
    if (!options) {
      const [firstMessage] = messages;
      if (!firstMessage) return;

      options = { before: firstMessage.id }
    }

    await query.fetchMore({
      query: MESSAGES,
      variables: { channel, ...options },
      updateQuery: (prev, { fetchMoreResult }) =>
        produce(prev, draftState => {
          draftState.channel.messages = [
            ...fetchMoreResult.channel.messages,
            ...draftState.channel.messages
          ]
        })
    })
  }

    useSubscription(NEW_MESSAGES, {
        variables: { channel },
        onSubscriptionData({ subscriptionData }) {
            query.updateQuery(prev =>
                produce(prev, ({ channel }) => {
                    channel.messages = [
                        ...channel.messages,
                        subscriptionData.data.message
                    ]
                })
            )
        }
    });

  useSubscription(UPDATED_MESSAGES, {
    variables: { channel },
    onSubscriptionData({ subscriptionData }) {
      query.updateQuery(prev =>
        produce(prev, ({ channel: { messages } }) => {
          const message = subscriptionData.data.messageUpdate;
          const index = messages.findIndex(m => m.id === message.id);

          if (index > -1) {
            messages[index] = message
          }
        })
      )
    }
  })

  useSubscription(DELETED_MESSAGES, {
    variables: { channel },
    onSubscriptionData({ subscriptionData }) {
      query.updateQuery(prev =>
        produce(prev, ({ channel }) => {
          const deletedMessages = subscriptionData.data.messageDelete

          channel.messages = channel.messages.filter(
            message => !deletedMessages.find(m => m.id === message.id)
          )
        })
      )
    }
  });

  return <any>{
    ready,
    messages,
    fetchMore,
    error: query.error,
      // @ts-ignore
    stale: query.stale
  }
};