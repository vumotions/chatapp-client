// Trong component Home hoặc bất kỳ component nào gọi getPosts
const fetchPosts = async () => {
  try {
    setLoading(true);
    // Đảm bảo truyền tham số đúng định dạng
    const response = await postService.getPosts({
      page: currentPage,
      limit: 10
    });
    
    if (response.data && response.data.data) {
      const { posts, hasMore } = response.data.data;
      setPosts(prevPosts => currentPage === 1 ? posts : [...prevPosts, ...posts]);
      setHasMore(hasMore);
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
    toast.error('Không thể tải bài viết');
  } finally {
    setLoading(false);
  }
};