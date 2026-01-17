import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send, Heart, Trash2, MoreVertical, X } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';

type Comment = {
  id: number;
  content: string;
  created_at: string;
  user: {
    id: number;
    name: string;
    avatar_url: string | null;
  };
  user_id: number;
  parent_id?: number | null;
  likesCount?: number;
  isLiked?: boolean;
};

type CommentSectionProps = {
  eventId: number;
};

export function CommentSection({ eventId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyingToName, setReplyingToName] = useState<string>('');
  const [likingComments, setLikingComments] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadComments();
  }, [eventId]);

  async function loadComments() {
    try {
      const res = await api.get(`/api/events/${eventId}/comments`);
      const commentsData = Array.isArray(res.data) ? res.data : [];
      
      // Initialiser sans les likes pour affichage rapide
      setComments(commentsData.map(c => ({ ...c, likesCount: 0, isLiked: false })));
      setLoading(false);
      
      // Charger les likes en arrière-plan si l'utilisateur est connecté
      if (user && commentsData.length > 0) {
        loadLikesInBackground(commentsData);
      }
    } catch (err) {
      logger.error('Load comments error:', err);
      setLoading(false);
    }
  }

  async function loadLikesInBackground(commentsData: any[]) {
    try {
      // Charger tous les likes de l'événement en UNE SEULE requête
      const likesRes = await api.get(`/api/events/${eventId}/comments-likes`);
      const likesByComment = likesRes.data.likes || {};
      
      logger.log('📥 Likes reçus du serveur:', JSON.stringify(likesByComment).substring(0, 200));
      
      setComments(prev => prev.map(comment => {
        const likesData = likesByComment[comment.id];
        const isLiked = likesData?.isLikedByCurrentUser || false;
        
        if (isLiked) {
          logger.log(`❤️  Commentaire ${comment.id} est liké par l'utilisateur`);
        }
        
        return {
          ...comment,
          likesCount: likesData?.count || 0,
          isLiked: isLiked
        };
      }));
    } catch (err) {
      logger.error('Load likes error:', err);
    }
  }

  async function postComment() {
    if (!newComment.trim()) return;
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour commenter');
      return;
    }

    setPosting(true);
    try {
      const payload: any = { content: newComment.trim() };
      if (replyingTo) {
        payload.parent_id = replyingTo;
      }
      
      await api.post(`/api/events/${eventId}/comments`, payload);
      setNewComment('');
      setReplyingTo(null);
      setReplyingToName('');
      loadComments();
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de l\'ajout du commentaire');
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId: number) {
    Alert.alert(
      'Supprimer le commentaire',
      'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/comments/${commentId}`);
              setComments(comments.filter(c => c.id !== commentId));
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  }

  async function toggleLike(commentId: number) {
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour liker');
      return;
    }

    // Empêcher les clics multiples sur le même commentaire
    if (likingComments.has(commentId)) {
      return;
    }

    // Marquer ce commentaire comme en cours de traitement
    setLikingComments(prev => new Set(prev).add(commentId));

    // Update optimiste : mettre à jour l'UI immédiatement
    const comment = comments.find(c => c.id === commentId);
    if (!comment) {
      setLikingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
      return;
    }

    const wasLiked = comment.isLiked;
    const originalLikesCount = comment.likesCount || 0;
    const newLikesCount = wasLiked ? Math.max(0, originalLikesCount - 1) : originalLikesCount + 1;

    // Mise à jour immédiate de l'UI
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, isLiked: !wasLiked, likesCount: newLikesCount }
        : c
    ));

    // Envoyer la requête en arrière-plan
    try {
      const res = await api.post(`/api/comment-likes/${commentId}/toggle`);
      
      // Synchroniser SEULEMENT si la réponse diffère de l'état optimiste
      if (res.data.liked !== !wasLiked || res.data.likesCount !== newLikesCount) {
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, isLiked: res.data.liked, likesCount: res.data.likesCount }
            : c
        ));
      }
    } catch (err: any) {
      // En cas d'erreur, revenir à l'état précédent
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { ...c, isLiked: wasLiked, likesCount: originalLikesCount }
          : c
      ));
      logger.error('Like error:', err);
    } finally {
      // Retirer le commentaire de la liste des likes en cours
      setLikingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }
  }

  function handleReply(commentId: number, userName: string) {
    setReplyingTo(commentId);
    setReplyingToName(userName);
    setNewComment(`@${userName} `);
  }

  function cancelReply() {
    setReplyingTo(null);
    setReplyingToName('');
    setNewComment('');
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function highlightMentions(text: string) {
    // Détecte les mentions @username et les hashtags #tag
    const parts = text.split(/(@\w+|#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <Text key={index} style={styles.mention}>
            {part}
          </Text>
        );
      }
      if (part.startsWith('#')) {
        return (
          <Text key={index} style={styles.hashtag}>
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  }

  function renderComment({ item }: { item: Comment }) {
    const isOwner = user?.id === item.user_id;
    const isLiked = item.isLiked || false;
    const likesCount = item.likesCount || 0;

    return (
      <View style={[styles.commentCard, item.parent_id ? styles.commentReply : null]}>
        <Image
          source={{ uri: item.user.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{highlightMentions(item.content)}</Text>
          
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleLike(item.id)}
            >
              <Heart
                size={16}
                color={isLiked ? colors.primary.pink : colors.text.muted}
                fill={isLiked ? colors.primary.pink : 'transparent'}
              />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
                {likesCount > 0 ? `${likesCount}` : 'J\'aime'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleReply(item.id, item.user.name)}
            >
              <Text style={styles.actionText}>Répondre</Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => deleteComment(item.id)}
              >
                <Trash2 size={16} color={colors.status.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Commentaires ({comments.length})
      </Text>

      {/* Comments List */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComment}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun commentaire pour le moment</Text>
            <Text style={styles.emptySubtext}>Soyez le premier à commenter !</Text>
          </View>
        }
      />

      {/* Comment Input */}
      {user && (
        <View>
          {replyingTo && (
            <View style={styles.replyingToContainer}>
              <Text style={styles.replyingToText}>
                Réponse à {replyingToName}
              </Text>
              <TouchableOpacity onPress={cancelReply}>
                <X size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputContainer}>
            <Image
              source={{ uri: user.avatar_url || 'https://via.placeholder.com/40' }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.input}
              placeholder={replyingTo ? `Répondre à ${replyingToName}...` : "Ajouter un commentaire..."}
              placeholderTextColor={colors.text.muted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              editable={!posting}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newComment.trim() || posting) && styles.sendButtonDisabled]}
              onPress={postComment}
              disabled={!newComment.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <Send size={20} color={newComment.trim() ? colors.primary.purple : colors.text.muted} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentCard: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: 8,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.text.muted,
  },
  commentText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  mention: {
    color: colors.primary.purple,
    fontWeight: '600',
  },
  hashtag: {
    color: colors.primary.pink,
    fontWeight: '600',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: colors.text.muted,
    fontWeight: '500',
  },
  actionTextActive: {
    color: colors.primary.pink,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.muted,
  },
  commentReply: {
    marginLeft: 40,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary.purple,
    paddingLeft: 12,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border.light,
  },
  replyingToText: {
    fontSize: 12,
    color: colors.primary.purple,
    fontWeight: '500',
  },
});
